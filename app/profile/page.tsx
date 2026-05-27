"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearAuth } from "@/lib/auth";
import { User } from "@/lib/types";
import {
  LogOut, Mail, Shield, User as UserIcon, BookOpen, Award, Clock
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Đọc thông tin user từ localStorage khi trang load
  useEffect(() => {
    const u = getUser();
    if (!u) {
      // Chưa đăng nhập → về trang login
      router.push("/login");
      return;
    }
    setUser(u);
  }, [router]);

  // Xử lý logout
  const handleLogout = () => {
    clearAuth();          // Xóa token + user khỏi localStorage
    router.push("/login"); // Chuyển về trang login
  };

  // Chưa load xong thì hiện loading
  if (!user) {
    return (
      <div className="ml-[72px] pt-14 min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-sm">Đang tải...</div>
      </div>
    );
  }

  // Lấy chữ cái đầu tên để hiện avatar
  const initials = user.fullName
    ? user.fullName.split(" ").pop()?.charAt(0).toUpperCase() ?? "?"
    : "?";

  // Map role sang tiếng Việt
  const roleLabel: Record<string, string> = {
    Student: "Học viên",
    Instructor: "Giảng viên",
    Admin: "Quản trị viên",
  };

  return (
    <div className="ml-[72px] pt-14 min-h-screen bg-[#eef2fb]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* ── Header card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-5">
          {/* Banner màu */}
          <div className="h-28 bg-gradient-to-r from-blue-500 to-indigo-600" />

          {/* Avatar + tên */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              {/* Avatar */}
              <div className="w-20 h-20 bg-primary rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-white text-3xl font-bold">
                {initials}
              </div>

              {/* Nút Đăng xuất */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
                Đăng xuất
              </button>
            </div>

            <h1 className="text-xl font-bold text-slate-800">{user.fullName}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>

            {/* Badge role */}
            <div className="flex gap-2 mt-3">
              <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold">
                {roleLabel[user.role] ?? user.role}
              </span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-semibold">
                Free
              </span>
            </div>
          </div>
        </div>

        {/* ── Thông tin chi tiết ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">
            Thông tin tài khoản
          </h2>

          <div className="flex flex-col gap-4">
            {/* Họ tên */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <UserIcon size={16} className="text-blue-500" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Họ và tên</div>
                <div className="text-sm font-semibold text-slate-700">{user.fullName}</div>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail size={16} className="text-indigo-500" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Email</div>
                <div className="text-sm font-semibold text-slate-700">{user.email}</div>
              </div>
            </div>

            {/* Vai trò */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield size={16} className="text-green-500" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Vai trò</div>
                <div className="text-sm font-semibold text-slate-700">
                  {roleLabel[user.role] ?? user.role}
                </div>
              </div>
            </div>

            {/* Bio nếu có */}
            {user.bio && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookOpen size={16} className="text-purple-500" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Giới thiệu</div>
                  <div className="text-sm text-slate-700">{user.bio}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Thống kê (UI tĩnh, có thể kết nối API sau) ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <BookOpen size={18} className="text-orange-400" />
            </div>
            <div className="text-xl font-bold text-slate-700">0</div>
            <div className="text-xs text-slate-400 mt-0.5">Khóa học</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Award size={18} className="text-green-400" />
            </div>
            <div className="text-xl font-bold text-slate-700">0</div>
            <div className="text-xs text-slate-400 mt-0.5">Chứng chỉ</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Clock size={18} className="text-blue-400" />
            </div>
            <div className="text-xl font-bold text-slate-700">0h</div>
            <div className="text-xs text-slate-400 mt-0.5">Học tập</div>
          </div>
        </div>

      </div>
    </div>
  );
}