"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import CourseCard from "@/components/course/CourseCard";
import { coursesApi } from "@/lib/api";
import { Course } from "@/lib/types";
import { ChevronRight, MessageCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";

const categoryTitles: Record<string, string> = {
  frontend: "Front-end",
  backend: "Back-end",
  database: "Database",
};

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");

    const request = selectedCategory
      ? coursesApi.getByCategory(selectedCategory, { pageSize: 50, isPublished: true })
      : coursesApi.getAll({ pageSize: 50, isPublished: true });

    request
      .then((res) => setCourses(res.items ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  const beginnerCourses = courses.filter((c) => c.level === "Beginner");
  const advancedCourses = courses.filter((c) => c.level !== "Beginner");

  return (
    <div className="flex min-h-screen bg-[#eef2fb]">
      <Sidebar
        activeCategory={selectedCategory ?? undefined}
        onCategoryChange={(category) => setSelectedCategory(category)}
        onHomeClick={() => setSelectedCategory(null)}
      />
      <div className="flex-1 ml-[72px]">
        <Navbar />
        <main className="pt-14 px-6 pb-10">

          {/* Banner */}
          <section className="mt-5 mb-7">
            <div className="h-44 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-500 flex items-center overflow-hidden relative">
              <div className="absolute right-8 top-1/2 -translate-y-1/2 w-40 h-40 bg-white/10 rounded-full blur-sm" />
              <div className="absolute right-24 bottom-0 w-24 h-24 bg-white/10 rounded-full blur-sm" />
              <div className="pl-10 z-10">
                <div className="text-white/90 text-sm mb-2">Học lập trình miễn phí</div>
                <button className="px-5 py-2 border-2 border-white text-white text-sm font-semibold rounded-full hover:bg-white hover:text-purple-700 transition-colors">
                  ĐĂNG KÝ NGAY
                </button>
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 6 ? "bg-white w-4" : "bg-white/40"}`} />
                ))}
              </div>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
                <ChevronRight size={16} className="text-white" />
              </button>
            </div>
          </section>

          <section className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">
              {selectedCategory ? `Khóa học ${categoryTitles[selectedCategory]}` : "Khóa học nổi bật"}
            </h1>
          </section>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="py-8 text-center text-red-500 text-sm">
              Không thể tải khóa học: {error}
            </div>
          )}

          {/* Courses */}
          {!loading && !error && (
            <>
              {beginnerCourses.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">Khóa học miễn phí</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {beginnerCourses.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </section>
              )}

              {advancedCourses.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-slate-800 mb-4">Khóa học nâng cao</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {advancedCourses.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </section>
              )}

              {courses.length === 0 && (
                <div className="py-16 text-center text-slate-400 text-sm">
                  Chưa có khóa học nào được xuất bản.
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <button className="fixed bottom-6 left-[86px] w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow border border-slate-100">
        <MessageCircle size={18} className="text-slate-500" />
      </button>
    </div>
  );
}
