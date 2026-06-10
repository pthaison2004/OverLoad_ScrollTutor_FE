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
      <div className="mb-4">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <svg viewBox="0 0 40 40" width="24" height="24">
            <path d="M20 4 L34 12 L34 28 L20 36 L6 28 L6 12 Z" fill="none" stroke="white" strokeWidth="3"/>
            <path d="M14 16 Q20 10 26 16 Q20 22 14 16Z" fill="white"/>
            <path d="M14 24 Q20 18 26 24 Q20 30 14 24Z" fill="rgba(255,255,255,0.6)"/>
          </svg>
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