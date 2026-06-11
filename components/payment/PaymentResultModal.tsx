"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Sparkles, BookOpen, ShieldAlert, X } from "lucide-react";

interface PaymentResultModalProps {
  status: "success" | "cancel";
  onClose: () => void;
}

export default function PaymentResultModal({ status, onClose }: PaymentResultModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      {/* Modal Box */}
      <div
        className="relative bg-white border border-slate-100 rounded-3xl w-full max-w-md p-8 text-center shadow-xl select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Icon Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-100 transition-colors"
        >
          <X size={14} />
        </button>

        {status === "success" ? (
          <div>
            {/* Success Glimpse */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-500 relative">
                <CheckCircle2 size={36} className="stroke-[1.5]" />
                <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 border-2 border-white animate-bounce">
                  <Sparkles size={10} fill="white" />
                </div>
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-2">Thanh toán thành công!</h1>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Cảm ơn bạn đã tin tưởng ScrollTutor. Giao dịch của bạn đã được cổng thanh toán xác nhận. Khóa học hoặc gói dịch vụ của bạn đã sẵn sàng để học.
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mb-6 text-left space-y-2.5">
              <div className="flex gap-2 items-center text-[10px] text-slate-600 font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Quyền truy cập kích hoạt tức thì</span>
              </div>
              <div className="flex gap-2 items-center text-[10px] text-slate-600 font-semibold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Đã nâng cấp tài khoản học viên</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all duration-200 shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5"
            >
              <BookOpen size={14} />
              Bắt đầu học ngay
            </button>
          </div>
        ) : (
          <div>
            {/* Cancel Glimpse */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500">
                <XCircle size={36} className="stroke-[1.5]" />
              </div>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-2">Thanh toán bị hủy</h1>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Giao dịch đã bị hủy bỏ hoặc không thể hoàn thành. Bạn chưa bị trừ tiền cho đơn hàng này.
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mb-6 text-left flex gap-2.5 items-start">
              <ShieldAlert size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <p className="font-bold text-slate-800">Yêu cầu hỗ trợ?</p>
                <p>Nếu có lỗi kỹ thuật, hãy kiểm tra lại tài khoản hoặc liên hệ với bộ phận hỗ trợ của ScrollTutor.</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all duration-200 border border-slate-950"
            >
              Đóng và quay lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
