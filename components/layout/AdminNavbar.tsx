"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearAuth } from "@/lib/auth";
import { User } from "@/lib/types";
import { Shield, LogOut } from "lucide-react";

export default function AdminNavbar({ title }: { title: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  useEffect(() => { setUser(getUser()); }, []);

  const initials = user?.fullName
    ? user.fullName.split(" ").pop()?.charAt(0).toUpperCase() ?? "?"
    : "?";

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <header className="fixed top-0 left-[72px] right-0 h-14 bg-white border-b border-slate-100 z-30 flex items-center px-5 gap-4">
      <div className="flex items-center gap-2">
        <Shield size={18} className="text-primary" />
        <span className="font-bold text-slate-800">{title}</span>
      </div>

      <div className="ml-auto flex items-center gap-3 relative">
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-700">{user?.fullName ?? "Admin"}</div>
          <div className="text-xs text-primary font-medium">Quản trị viên</div>
        </div>

        {/* Avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            {initials}
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              {/* Menu */}
              <div className="absolute right-0 top-11 z-20 bg-white rounded-xl shadow-lg border border-slate-100 w-44 py-1 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 truncate">{user?.fullName}</div>
                  <div className="text-xs text-slate-400 truncate">{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}