"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Menu, MoreVertical, Lock, Zap } from "lucide-react";
import LessonContent from "@/components/course/LessonContent";
import LessonSidebar from "@/components/course/LessonSidebar";
import { coursesApi, enrollmentsApi, lessonsApi, paymentApi } from "@/lib/api";
import { getUser, isLoggedIn } from "@/lib/auth";
import { Course, Lesson, LessonWithProgress } from "@/lib/types";
import { useLessonProgress } from "@/lib/useLessonProgress";
import { fetchUserActivePlan } from "@/lib/subscription";
import PricingModal from "@/components/payment/PricingModal";

type CourseLesson = Lesson | LessonWithProgress;

function hasLessonProgress(lesson: CourseLesson): lesson is LessonWithProgress {
  return "completed" in lesson;
}

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"desc" | "qa" | "author">("desc");
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<"FREE" | "PLUS" | "PRO">("FREE");
  const { courseProgress, progressLoading, loadCourseProgress } = useLessonProgress(id);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError("");
    setActiveLesson(null);

    Promise.all([coursesApi.getById(id), coursesApi.getLessons(id)])
      .then(async ([nextCourse, nextLessons]) => {
        setCourse(nextCourse);
        setLessons(nextLessons);
        setActiveLessonId(nextLessons[0]?.id ?? null);

        const user = getUser();
        if (!user) {
          setIsEnrolled(false);
          return;
        }

        try {
          const plan = await fetchUserActivePlan(user.id);
          setActivePlan(plan);

          const enrollments = await enrollmentsApi.getByUser(user.id);
          const enrolled = enrollments.some((enrollment) => enrollment.courseId === id);

          const isStaff = user.role === "Admin" || user.role === "Instructor" || user.role === "Manager";
          const hasAccess =
            isStaff ||
            nextCourse.level === "Beginner" ||
            nextCourse.price === 0 ||
            (nextCourse.level === "Intermediate" && (plan === "PLUS" || plan === "PRO")) ||
            (nextCourse.level === "Advanced" && plan === "PRO");

          if (enrolled) {
            setIsEnrolled(true);
            loadCourseProgress(id);
          } else if (hasAccess) {
            // Auto-enroll since the user has active subscription or it's a free course
            try {
              await enrollmentsApi.enroll(user.id, id);
            } catch {
              // Already enrolled is fine
            }
            setIsEnrolled(true);
            loadCourseProgress(id);
          } else {
            setIsEnrolled(false);
          }
        } catch {
          setIsEnrolled(false);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load course"))
      .finally(() => setLoading(false));
  }, [id, loadCourseProgress]);

  useEffect(() => {
    if (!activeLessonId || !isEnrolled) return;

    const lessonFromList = lessons.find((lesson) => lesson.id === activeLessonId);
    if (lessonFromList && "content" in lessonFromList) {
      setActiveLesson(lessonFromList);
    } else {
      setActiveLesson(null);
    }

    setLessonLoading(true);
    lessonsApi
      .getById(activeLessonId)
      .then(setActiveLesson)
      .catch((err) => console.error("Failed to load lesson content:", err))
      .finally(() => setLessonLoading(false));
  }, [activeLessonId, isEnrolled]);

  const activeLessonProgress = useMemo(
    () => lessons.find((lesson) => lesson.id === activeLessonId),
    [activeLessonId, lessons]
  );
  const currentIndex = lessons.findIndex((lesson) => lesson.id === activeLessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const handleLessonSelect = (lessonId: number) => {
    if (!isEnrolled) return;
    const targetLesson = lessons.find((l) => l.id === lessonId);
    if (targetLesson && "isLocked" in targetLesson && targetLesson.isLocked) {
      alert("Bạn cần hoàn thành bài học trước đó để mở khóa bài học này.");
      return;
    }
    setActiveLessonId(lessonId);
  };

  const handleLessonCompleted = (lessonId: number) => {
    setLessons((currentLessons) => {
      const updated = currentLessons.map((lesson) =>
        lesson.id === lessonId
          ? {
              ...lesson,
              completed: true,
              watchPercentage: 100,
              lastPositionSeconds: 0,
              isLocked: false,
            }
          : lesson
      );
      // Unlock the next lesson in the list optimistically
      const completedIdx = updated.findIndex((l) => l.id === lessonId);
      if (completedIdx >= 0 && completedIdx < updated.length - 1) {
        updated[completedIdx + 1] = {
          ...updated[completedIdx + 1],
          isLocked: false,
        };
      }
      return updated;
    });

    // Sync from server
    coursesApi.getLessons(id).then(setLessons).catch(console.error);
    loadCourseProgress(id);
  };

  const handleEnroll = async () => {
    if (!isLoggedIn()) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
      }
      router.push("/login");
      return;
    }

    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    if (!course) return;

    setLessonLoading(true);
    try {
      if (course.price > 0) {
        const fromPath = typeof window !== "undefined" ? window.location.pathname : "/";
        const res = await paymentApi.createLink({
          courseId: id,
          returnUrl: `${window.location.origin}/payment/success?from=${encodeURIComponent(fromPath)}`,
          cancelUrl: `${window.location.origin}/payment/cancel?from=${encodeURIComponent(fromPath)}`,
        });
        if (res && res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          throw new Error("Không thể tạo liên kết thanh toán.");
        }
      } else {
        await enrollmentsApi.enroll(user.id, id);
        setIsEnrolled(true);
        loadCourseProgress(id);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already") || msg.includes("409")) {
        setIsEnrolled(true);
        loadCourseProgress(id);
      } else {
        setError(msg || "Có lỗi xảy ra, vui lòng thử lại.");
      }
    } finally {
      setLessonLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-slate-500 mb-4">{error || "Khong tim thay khoa hoc"}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Quay lai trang chu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div
        className={`${
          sidebarOpen ? "w-[280px] min-w-[280px]" : "w-0 min-w-0"
        } transition-all duration-300 overflow-hidden border-r border-slate-200`}
      >
        {sidebarOpen && (
          <LessonSidebar
            course={course}
            lessons={lessons}
            activeLessonId={activeLessonId}
            onLessonSelect={handleLessonSelect}
            onClose={() => setSidebarOpen(false)}
            courseProgress={courseProgress}
            progressLoading={progressLoading}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 bg-slate-900 flex items-center px-4 gap-3 shrink-0">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white transition-colors">
              <Menu size={18} />
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-white/60 truncate">
            <Link href="/" className="hover:text-white transition-colors shrink-0">
              Trang chu
            </Link>
            <span>/</span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-3 h-3 rounded bg-orange-500 inline-block" />
              {course.title}
            </span>
            {activeLesson && (
              <>
                <span>/</span>
                <span className="text-white truncate">{activeLesson.title}</span>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            <button
              onClick={() => prevLesson && handleLessonSelect(prevLesson.id)}
              disabled={!prevLesson}
              className="text-white/60 hover:text-white transition-colors text-xs flex items-center gap-1 disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Truoc
            </button>
            <button
              onClick={() => nextLesson && handleLessonSelect(nextLesson.id)}
              disabled={!nextLesson || ("isLocked" in nextLesson && nextLesson.isLocked)}
              className="px-4 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1 disabled:opacity-30"
            >
              Tiep theo <ChevronRight size={14} />
            </button>
            <button className="text-white/60 hover:text-white transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {isEnrolled ? (
            activeLesson && !lessonLoading ? (
              <LessonContent
                lesson={activeLesson}
                course={course}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onLessonCompleted={handleLessonCompleted}
                initialCompleted={activeLessonProgress ? hasLessonProgress(activeLessonProgress) && activeLessonProgress.completed : false}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={28} className="animate-spin text-blue-500" />
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 max-w-md mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm animate-bounce">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">{course.title}</h2>
                
                {!isLoggedIn() ? (
                  <>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                      Đăng nhập tài khoản để tham gia khóa học này.
                    </p>
                    <button
                      onClick={handleEnroll}
                      disabled={lessonLoading}
                      className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-60"
                    >
                      {lessonLoading && <Loader2 size={14} className="animate-spin" />}
                      Đăng nhập để học
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                      {course.level === "Intermediate" 
                        ? "Khóa học này yêu cầu tài khoản của bạn đạt xếp hạng PLUS hoặc PRO. Vui lòng nâng cấp gói thành viên để tiếp tục." 
                        : "Khóa học này yêu cầu tài khoản của bạn đạt xếp hạng PRO. Vui lòng nâng cấp gói thành viên để tiếp tục."
                      }
                    </p>
                    <button
                      onClick={() => setIsPricingOpen(true)}
                      className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:opacity-95 transition-opacity flex items-center justify-center gap-2 mx-auto shadow-md"
                    >
                      <Zap size={16} fill="white" />
                      Nâng cấp tài khoản ngay
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {isPricingOpen && (
        <PricingModal 
          onClose={async () => {
            setIsPricingOpen(false);
            // Recheck enrollments after closing pricing modal
            const user = getUser();
            if (user && course) {
              try {
                const plan = await fetchUserActivePlan(user.id);
                setActivePlan(plan);
                const enrollments = await enrollmentsApi.getByUser(user.id);
                const enrolled = enrollments.some((enrollment) => enrollment.courseId === id);
                
                const isStaff = user.role === "Admin" || user.role === "Instructor" || user.role === "Manager";
                const hasAccess =
                  isStaff ||
                  course.level === "Beginner" ||
                  course.price === 0 ||
                  (course.level === "Intermediate" && (plan === "PLUS" || plan === "PRO")) ||
                  (course.level === "Advanced" && plan === "PRO");

                if (enrolled) {
                  setIsEnrolled(true);
                  loadCourseProgress(id);
                } else if (hasAccess) {
                  try {
                    await enrollmentsApi.enroll(user.id, id);
                  } catch {}
                  setIsEnrolled(true);
                  loadCourseProgress(id);
                }
              } catch (e) {
                console.error(e);
              }
            }
          }} 
        />
      )}
    </div>
  );
}
