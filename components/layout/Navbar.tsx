"use client";
import { Search, Zap, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser, saveUser } from "@/lib/auth";
import { User } from "@/lib/types";
import PricingModal from "@/components/payment/PricingModal";
import { usersApi } from "@/lib/api";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [showRejectionAlert, setShowRejectionAlert] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u && u.studentVerificationStatus === "REJECTED" && !u.hasSeenStudentRejection) {
      setShowRejectionAlert(true);
    }
  }, []);

  const handleDismissRejection = async () => {
    try {
      await usersApi.dismissRejection();
      const u = getUser();
      if (u) {
        const updatedUser = { ...u, hasSeenStudentRejection: true };
        saveUser(updatedUser);
        setUser(updatedUser);
      }
      setShowRejectionAlert(false);
    } catch (err) {
      console.error("Lỗi khi tắt thông báo từ chối:", err);
      setShowRejectionAlert(false);
    }
  };

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
        <button
          onClick={() => setIsPricingOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-600 hover:bg-orange-600 transition-colors"
        >
          <Zap size={14} fill="white" />
          Nâng cấp
        </button>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-sm font-600 text-slate-700 leading-tight">
              {user?.fullName ?? "Khách"}
            </div>
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
      {isPricingOpen && <PricingModal onClose={() => setIsPricingOpen(false)} />}

      {showRejectionAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-white text-slate-800 border border-slate-100 rounded-3xl w-full max-w-sm p-6 shadow-xl text-center select-none animate-[scaleIn_0.15s_ease-out]">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-2">Đơn xác minh bị từ chối</h3>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Đơn xác minh học sinh, sinh viên của bạn đã bị từ chối. Vui lòng kiểm tra và nộp lại ảnh thẻ hợp lệ trong trang cá nhân.
            </p>
            <button
              onClick={handleDismissRejection}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-md shadow-red-100 active:scale-95"
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
