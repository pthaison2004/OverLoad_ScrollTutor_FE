"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import CourseCard from "@/components/course/CourseCard";
import { coursesApi, enrollmentsApi } from "@/lib/api";
import { Course, EnrollmentDetail } from "@/lib/types";
import { getUser, isLoggedIn } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

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

    setLoading(true);
    setError("");

    enrollmentsApi
      .getByUserDetails(user.id)
      .then(async (data) => {
        setEnrollments(data);

        if (data.length === 0) {
          setCourses([]);
          return;
        }

        const coursePromises = data.map((item) => coursesApi.getById(item.courseId));
        const courseResults = await Promise.all(coursePromises);
        setCourses(courseResults);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const items = enrollments
    .map((enrollment) => ({
      enrollment,
      course: courseMap.get(enrollment.courseId),
    }))
    .filter((item): item is { enrollment: EnrollmentDetail; course: Course } => Boolean(item.course));

  return (
    <div className="flex min-h-screen bg-[#eef2fb]">
      <Sidebar />
      <div className="flex-1 ml-[72px]">
        <Navbar />
        <main className="pt-14 px-6 pb-10">
          <section className="mt-5 mb-7">
            <div className="flex flex-col gap-3">
              <div className="text-sm text-slate-500">Danh sách khóa học đã đăng ký</div>
              <h1 className="text-3xl font-bold text-slate-900">Khóa của tôi</h1>
            </div>
          </section>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          )}

          {error && !loading && (
            <div className="py-8 text-center text-red-500 text-sm">
              Không thể tải khóa học: {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-sm">
              Bạn chưa đăng ký khóa học nào.
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(({ enrollment, course }) => (
                <div key={enrollment.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <CourseCard course={course} />
                  <div className="p-4 bg-slate-50">
                    <div className="text-sm text-slate-600 mb-1">Khóa: {course.title}</div>
                    <div className="text-sm text-slate-600">Tiến độ: {enrollment.progressPercentage ?? 0}%</div>
                    <div className="text-sm text-slate-600">Đăng ký: {new Date(enrollment.enrolledAt).toLocaleDateString()}</div>
                    <div className="text-sm text-slate-600">
                      {enrollment.completedAt ? `Hoàn thành: ${new Date(enrollment.completedAt).toLocaleDateString()}` : "Chưa hoàn thành"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
