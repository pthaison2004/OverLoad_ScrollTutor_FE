"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { getUser, clearAuth } from "@/lib/auth";
import { User as UserType } from "@/lib/types";
import { 
  Layout, Server, Database, LogOut, User, Layers, ArrowLeft, ShieldAlert
} from "lucide-react";

function InstructorToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    // Redirect if not instructor/admin (extra safety guard)
    if (u && u.role !== "Admin" && u.role !== "Instructor") {
      router.push("/");
    }
  }, [router]);

  const activeCategory = searchParams.get("category")?.toLowerCase() || "";

  const handleCategoryClick = (category: string) => {
    // Navigate to dashboard with category query
    if (category) {
      router.push(`/instructor/dashboard?category=${category}`);
    } else {
      router.push(`/instructor/dashboard`);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const initials = user?.fullName
    ? user.fullName.split(" ").pop()?.charAt(0).toUpperCase() ?? "?"
    : "?";

  const categories = [
    { value: "frontend", label: "Frontend", icon: Layout, activeClass: "bg-blue-50/60 text-blue-600", hoverClass: "hover:bg-blue-50/30 hover:text-blue-600" },
    { value: "backend", label: "Backend", icon: Server, activeClass: "bg-indigo-50/60 text-indigo-600", hoverClass: "hover:bg-indigo-50/30 hover:text-indigo-600" },
    { value: "database", label: "Database", icon: Database, activeClass: "bg-amber-50/60 text-amber-600", hoverClass: "hover:bg-amber-50/30 hover:text-amber-600" },
  ];

  return (
    <aside className="w-64 md:w-72 bg-white border-r border-slate-100 fixed top-0 left-0 bottom-0 h-screen flex flex-col justify-between p-6 z-40 shadow-[10px_0_30px_rgba(0,0,0,0.01)]">
      {/* Upper content */}
      <div className="flex flex-col gap-8">
        {/* Brand / Title & Instructor Badge */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-slate-800 tracking-wide">
              ScrollTutor Studio
            </h2>
            <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0">
              Instructor
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Quản trị nội dung giảng dạy
          </p>
        </div>

        {/* Separator line */}
        <div className="h-px bg-slate-100 w-full" />

        {/* Categories / Navigation */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Layers size={11} /> Lĩnh vực khóa học
          </h3>

          <div className="flex flex-col gap-1.5">
            {/* All Courses / Clear Filter button */}
            <button
              onClick={() => handleCategoryClick("")}
              className={`w-full px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-3 transition-all duration-150 active:scale-98 relative ${
                activeCategory === "" 
                  ? "bg-slate-100 text-slate-900"
                  : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {activeCategory === "" && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-slate-900 rounded-r" />}
              <Layers size={14} className={activeCategory === "" ? "text-slate-900" : "text-slate-400"} />
              Tất cả khóa học
            </button>

            {categories.map((cat) => {
              const isActive = activeCategory === cat.value;
              const IconComp = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryClick(cat.value)}
                  className={`w-full px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-3 transition-all duration-150 active:scale-98 relative ${
                    isActive 
                      ? `${cat.activeClass}`
                      : `bg-transparent text-slate-500 ${cat.hoverClass}`
                  }`}
                >
                  {isActive && (
                    <div className={`absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-r ${
                      cat.value === "frontend" ? "bg-blue-600" : cat.value === "backend" ? "bg-indigo-600" : "bg-amber-500"
                    }`} />
                  )}
                  <IconComp size={14} className={isActive ? "" : "text-slate-400"} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Profile and Sign out */}
      <div className="flex flex-col gap-4">
        {/* Separator line */}
        <div className="h-px bg-slate-100 w-full" />

        <div className="flex items-center justify-between gap-3">
          {/* Avatar click to profile */}
          <Link href="/profile" className="shrink-0 group relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-sm border-2 border-white shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200">
              {initials}
            </div>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-[9px] font-bold text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
              Xem Profile
            </div>
          </Link>

          {/* User Details */}
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-slate-800 text-xs truncate leading-tight">
              {user?.fullName ?? "Instructor"}
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
              {user?.email ?? "instructor@scrolltutor.com"}
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all duration-200 active:scale-90"
            title="Đăng xuất"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar Toolbar on the Left */}
      <Suspense fallback={
        <div className="w-64 md:w-72 bg-white border-r border-slate-100 fixed top-0 left-0 bottom-0 h-screen" />
      }>
        <InstructorToolbar />
      </Suspense>

      {/* Main content with left margin to prevent toolbar overlay */}
      <div className="flex-1 ml-64 md:ml-72 min-h-screen">
        {children}
      </div>
    </div>
  );
}
