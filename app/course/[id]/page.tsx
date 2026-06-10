"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Menu, MoreVertical } from "lucide-react";
import LessonContent from "@/components/course/LessonContent";
import LessonSidebar from "@/components/course/LessonSidebar";
import { coursesApi, enrollmentsApi, lessonsApi } from "@/lib/api";
import { getUser, isLoggedIn } from "@/lib/auth";
import { Course, Lesson, LessonWithProgress } from "@/lib/types";
import { useLessonProgress } from "@/lib/useLessonProgress";

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
  const { courseProgress, progressLoading, loadCourseProgress } = useLessonProgress(id);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError("");
    setActiveLesson(null);

    Promise.all([coursesApi.getById(id), coursesApi.getLessons(id)])
      .then(([nextCourse, nextLessons]) => {
        setCourse(nextCourse);
        setLessons(nextLessons);
        setActiveLessonId(nextLessons[0]?.id ?? null);

        const user = getUser();
        if (!user) {
          setIsEnrolled(false);
          return;
        }

        enrollmentsApi
          .getByUser(user.id)
          .then((enrollments) => {
            const enrolled = enrollments.some((enrollment) => enrollment.courseId === id);
            setIsEnrolled(enrolled);
            if (enrolled) {
              loadCourseProgress(id);
            }
          })
          .catch(() => setIsEnrolled(false));
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
    setActiveLessonId(lessonId);
  };

  const handleLessonCompleted = (lessonId: number) => {
    setLessons((currentLessons) =>
      currentLessons.map((lesson) =>
        lesson.id === lessonId
          ? {
              ...lesson,
              completed: true,
              watchPercentage: 100,
              lastPositionSeconds: 0,
              isLocked: false,
            }
          : lesson
      )
    );
    loadCourseProgress(id);
  };

  const handleEnroll = async () => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      await enrollmentsApi.enroll(user.id, id);
    } catch {
      // Already enrolled is treated as success.
    } finally {
      setIsEnrolled(true);
      loadCourseProgress(id);
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
              disabled={!nextLesson}
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
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800 mb-2">{course.title}</h2>
                <p className="text-slate-500 text-sm mb-6">Dang ky khoa hoc de bat dau hoc</p>
                <button
                  onClick={handleEnroll}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  {isLoggedIn() ? "Dang ky hoc mien phi" : "Dang nhap de hoc"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
