"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, FileText, Users2, LogOut } from "lucide-react";
import { clearAuth } from "@/lib/auth";

const navItems = [
  { href: "/manager", label: "Dashboard", icon: LayoutDashboard },
  { href: "/manager/courses", label: "Khóa học", icon: BookOpen },
  { href: "/manager/lessons", label: "Bài học", icon: FileText },
  { href: "/manager/enrollments", label: "Enrollments", icon: Users2 },
];

export default function ManagerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="mb-4">
        <div className="w-10 h-10 flex items-center justify-center">
          <img src="/logo.png" alt="ScrollTutor" className="w-9 h-9 object-contain" />
        </div>
      </div>

      <div className="flex-1 w-full space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-item ${pathname === href ? "active" : ""}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <button onClick={handleLogout} className="sidebar-item w-full mt-auto text-red-400 hover:bg-red-50 hover:text-red-500">
        <LogOut size={20} />
        <span>Đăng xuất</span>
      </button>
    </aside>
  );
}