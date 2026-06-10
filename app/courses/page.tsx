"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import CourseCard from "@/components/course/CourseCard";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import PaymentResultModal from "@/components/payment/PaymentResultModal";
import { coursesApi, enrollmentsApi, usersApi } from "@/lib/api";
import { getUser, isLoggedIn } from "@/lib/auth";
import { UserCourse } from "@/lib/types";

export default function MyCoursesPage() {
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentResult, setPaymentResult] = useState<"success" | "cancel" | null>(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payStatus = params.get("payment");
    if (payStatus === "success" || payStatus === "cancel") {
      setPaymentResult(payStatus);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const userId = user.id;

    setLoading(true);
    setError("");

    async function loadCourses() {
      try {
        const data = await usersApi.getMyCoursesWithProgress();
        setUserCourses(data.filter((course) => course.category !== "System"));
      } catch {
        const enrollments = await enrollmentsApi.getByUserDetails(userId);
        const courses = await Promise.all(enrollments.map((item) => coursesApi.getById(item.courseId)));
        const courseMap = new Map(courses.map((course) => [course.id, course]));

        const fallbackCourses: UserCourse[] = [];
        for (const enrollment of enrollments) {
          const course = courseMap.get(enrollment.courseId);
          if (!course || course.category === "System") continue;

          fallbackCourses.push({
            courseId: course.id,
            title: course.title,
            thumbnailUrl: course.thumbnailUrl,
            category: course.category,
            price: course.price,
            level: course.level,
            progressPercentage: enrollment.progressPercentage ?? 0,
            completedLessons: 0,
            totalLessons: course.totalLessons ?? 0,
            lastAccessedAt: enrollment.lastAccessedAt,
            isCompleted: Boolean(enrollment.completedAt),
          });
        }

        setUserCourses(fallbackCourses);
      }
    }

    loadCourses()
      .catch((err) => setError(err instanceof Error ? err.message : "Khong the tai khoa hoc"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="flex min-h-screen bg-[#eef2fb]">
      <Sidebar />
      <div className="flex-1 ml-[72px]">
        <Navbar />
        <main className="pt-14 px-6 pb-10">
          <section className="mt-5 mb-7">
            <div className="flex flex-col gap-3">
              <div className="text-sm text-slate-500">Danh sach khoa hoc da dang ky</div>
              <h1 className="text-3xl font-bold text-slate-900">Khoa cua toi</h1>
            </div>
          </section>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          )}

          {error && !loading && (
            <div className="py-8 text-center text-red-500 text-sm">Khong the tai khoa hoc: {error}</div>
          )}

          {!loading && !error && userCourses.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-sm">Ban chua dang ky khoa hoc nao.</div>
          )}

          {!loading && !error && userCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userCourses.map((course) => (
                <div key={course.courseId} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <CourseCard course={course} showProgress />
                  <div className="px-4 pb-4 bg-white text-xs text-slate-500">
                    {course.lastAccessedAt
                      ? `Cap nhat: ${new Date(course.lastAccessedAt).toLocaleDateString("vi-VN")}`
                      : "Chua co lan hoc gan nhat"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      {paymentResult && <PaymentResultModal status={paymentResult} onClose={() => setPaymentResult(null)} />}
    </div>
  );
}
