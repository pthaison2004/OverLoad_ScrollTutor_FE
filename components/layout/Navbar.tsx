"use client";
import { Search, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";   
import { getUser } from "@/lib/auth";           
import { User } from "@/lib/types";             
export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
 
  useEffect(() => {
    // Đọc user từ localStorage sau khi trang load xong
    setUser(getUser());
  }, []);
   const initials = user?.fullName
    ? user.fullName.split(" ").pop()?.charAt(0).toUpperCase() ?? "?"
    : "?";
  return (
    <header className="fixed top-0 left-[72px] right-0 h-14 bg-white border-b border-slate-100 z-30 flex items-center px-5 gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-primary text-slate-700 placeholder:text-slate-400"
          placeholder="Tìm kiếm khóa học, bài viết, video, ..."
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Upgrade btn */}
        <button className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-600 hover:bg-orange-600 transition-colors">
          <Zap size={14} fill="white" />
          Nâng cấp
        </button>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-sm font-600 text-slate-700 leading-tight">
              {user?.fullName ?? "Khách"}</div>
            <div className="flex gap-1 justify-end mt-0.5">
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded font-500">Free</span>
              <span className="text-xs bg-blue-50 text-primary px-1.5 rounded font-500">Học viên</span>
            </div>
          </div>
          <Link href="/profile">
            <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white font-700 text-sm cursor-pointer hover:bg-primary-hover transition-colors">
              {initials}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
