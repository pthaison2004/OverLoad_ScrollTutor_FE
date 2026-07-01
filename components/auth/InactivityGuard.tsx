"use client";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { Clock, ShieldAlert } from "lucide-react";

export default function InactivityGuard() {
  const { isExpired, logout } = useInactivityLogout();

  if (!isExpired) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
      onClick={logout}
    >
      <div
        className="bg-white text-slate-800 border border-slate-100 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center select-none animate-[scaleIn_0.2s_ease-out]"
        onClick={(e) => {
          e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài, nhưng vẫn logout khi click nút
          logout();
        }}
      >
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mx-auto mb-4 animate-bounce">
          <Clock size={28} />
        </div>
        
        <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center justify-center gap-1.5">
          <ShieldAlert size={18} className="text-amber-500" />
          Phiên làm việc hết hạn
        </h3>
        
        <p className="text-slate-500 text-xs leading-relaxed mb-6">
          Bạn đã không hoạt động trong 15 phút vừa qua. Để bảo mật tài khoản, phiên làm việc của bạn đã kết thúc.
        </p>

        <button
          onClick={logout}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-200/50"
        >
          Xác nhận đăng nhập lại
        </button>
      </div>
    </div>
  );
}
