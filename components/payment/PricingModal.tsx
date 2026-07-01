"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Zap, Loader2, Sparkles, Trophy, Star, Wallet, AlertCircle, Clock, ShieldCheck, MessageCircle } from "lucide-react";
import { paymentApi, enrollmentsApi } from "@/lib/api";
import { getUser } from "@/lib/auth";

interface PricingModalProps {
  onClose: () => void;
}

export default function PricingModal({ onClose }: PricingModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [showConfirmDeposit, setShowConfirmDeposit] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });
  const [activePlan, setActivePlan] = useState<{ type: "plus" | "pro"; expiration: Date } | null>(null);

  const user = getUser();
  const isStudentApproved = user?.studentVerificationStatus === "APPROVED";

  // Giá gói
  const plusMonthlyPrice = isStudentApproved ? 48300 : 69000;
  const proMonthlyPrice = isStudentApproved ? 83300 : 119000;

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";

    if (user) {
      paymentApi.getBalance()
        .then(res => setBalance(res.balance))
        .catch(err => console.error(err));

      enrollmentsApi.getByUserDetails(user.id)
        .then(res => {
          const subscriptionEnrollments = res
            .filter(e => e.courseSlug === "pro-upgrade-month" || e.courseSlug === "pro-upgrade-year" || e.courseSlug === "plus-upgrade-month")
            .map(e => ({
              enrolledAt: new Date(e.enrolledAt),
              durationDays: e.courseSlug.includes("year") ? 365 : 30,
              isPro: e.courseSlug.includes("pro-upgrade"),
            }))
            .sort((a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime());

          for (const planType of ["pro", "plus"] as const) {
            const planEnrollments = subscriptionEnrollments.filter(e => planType === "pro" ? e.isPro : !e.isPro);
            if (planEnrollments.length > 0) {
              let expiration: Date | null = null;
              for (const item of planEnrollments) {
                if (expiration === null || expiration < item.enrolledAt) {
                  expiration = new Date(item.enrolledAt.getTime() + item.durationDays * 24 * 60 * 60 * 1000);
                } else {
                  expiration = new Date(expiration.getTime() + item.durationDays * 24 * 60 * 60 * 1000);
                }
              }
              if (expiration && expiration > new Date()) {
                setActivePlan({ type: planType, expiration });
                break;
              }
            }
          }
        })
        .catch(err => console.error("Lỗi lấy thông tin gói:", err));
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const getRemainingTimeString = (expirationDate: Date) => {
    const now = new Date();
    const diffMs = expirationDate.getTime() - now.getTime();
    if (diffMs <= 0) return "Đã hết hạn";
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diffDays > 0) return `${diffDays} ngày ${diffHours} giờ`;
    return `${diffHours} giờ`;
  };

  if (!mounted) return null;

  const handleUpgrade = async (packageType: "plus-month" | "month") => {
    if (!user) { router.push("/login"); return; }
    setLoading(packageType); setError("");
    try {
      const fromPath = typeof window !== "undefined" ? window.location.pathname : "/";
      const res = await paymentApi.createProLink({
        packageType,
        returnUrl: `${window.location.origin}/payment/success?from=${encodeURIComponent(fromPath)}`,
        cancelUrl: `${window.location.origin}/payment/cancel?from=${encodeURIComponent(fromPath)}`,
      });
      if (res && res.checkoutUrl) { window.location.href = res.checkoutUrl; }
      else { throw new Error("Không thể tạo liên kết thanh toán."); }
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi kết nối tới cổng thanh toán.");
      setLoading(null);
    }
  };

  const handleUpgradeWithBalance = async (packageType: "plus-month" | "month") => {
    if (!user) { router.push("/login"); return; }
    setLoading(packageType + "-balance"); setError("");
    try {
      await paymentApi.buyProWithBalance({ packageType });
      onClose();
      router.replace(window.location.pathname + "?payment=success");
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi thanh toán bằng số dư.");
      setLoading(null);
    }
  };

  const plusFeatures = [
    "Mở khóa toàn bộ khóa học Premium",
    "20 câu hỏi AI Chatbot / ngày",
    "Học tương tác Scrollytelling",
  ];

  const proFeatures = [
    "Mở khóa toàn bộ khóa học Premium",
    "Không giới hạn câu hỏi AI Chatbot",
    "Học tương tác Scrollytelling & Visualizer",
    "Hỗ trợ 1:1 từ Giảng viên",
  ];

  const renderUpgradeButton = (
    packageType: "plus-month" | "month",
    price: number,
    label: string,
    isPrimary: boolean
  ) => {
    if (!getUser()) {
      return (
        <button
          onClick={() => { onClose(); router.push("/login"); }}
          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 ${
            isPrimary ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
          }`}
        >
          Đăng nhập để nâng cấp
        </button>
      );
    }

    if (balance === null) {
      return (
        <button disabled className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5">
          <Loader2 size={13} className="animate-spin text-slate-404" />
          Đang tải số dư...
        </button>
      );
    }

    if (balance >= price) {
      return (
        <button
          onClick={() => handleUpgradeWithBalance(packageType)}
          disabled={loading !== null}
          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all duration-205 flex items-center justify-center gap-1.5 disabled:opacity-50 ${
            isPrimary ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100" : "bg-slate-900 hover:bg-slate-800 text-white"
          }`}
        >
          {loading === packageType + "-balance" ? (
            <Loader2 size={13} className="animate-spin text-white" />
          ) : (
            <Wallet size={13} className="shrink-0" />
          )}
          {label} - {price.toLocaleString("vi-VN")}đ
        </button>
      );
    }

    return (
      <button
        onClick={() => setShowConfirmDeposit({ show: true, amount: price })}
        disabled={loading !== null}
        className="w-full py-2 rounded-xl border bg-slate-200/20 hover:bg-slate-200/35 border-slate-300/30 text-slate-650 hover:text-slate-850 transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-sm"
      >
        <Wallet size={14} className="shrink-0 text-slate-404" />
        <div className="flex flex-col items-center text-center">
          <span className="font-bold text-xs">{label}</span>
          <span className="text-[9px] font-medium mt-0.5 text-slate-500">Số dư ví không đủ</span>
        </div>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative bg-white text-slate-800 border border-slate-100 rounded-3xl w-full max-w-3xl p-6 md:p-8 shadow-xl select-none animate-[scaleIn_0.2s_ease-out] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-slate-55 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-150 transition-colors z-10">
          <X size={16} />
        </button>

        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full mb-2.5">
            <Sparkles size={11} className="text-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-650">Chọn gói phù hợp với bạn</span>
            {isStudentApproved && (
              <>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-505" />
                  Sinh viên (-30%)
                </span>
              </>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">Nâng cấp tài khoản</h2>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Mở khóa toàn bộ khóa học Premium và tính năng AI Chatbot hỗ trợ học tập.
          </p>
        </div>

        {/* Active plan banner */}
        {activePlan && (
          <div className="max-w-md mx-auto mb-5 p-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-2.5 shadow-sm text-left animate-[fadeIn_0.2s_ease-out]">
            <div className="p-2 bg-indigo-100/60 rounded-xl text-indigo-600 shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Bạn đang sở hữu gói {activePlan.type === "pro" ? "PRO" : "PLUS"}
              </p>
              <p className="text-[10px] text-slate-505 mt-0.5">
                Thời gian còn lại: <span className="font-semibold text-indigo-600">{getRemainingTimeString(activePlan.expiration)}</span> (hết hạn ngày {activePlan.expiration.toLocaleDateString("vi-VN")})
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto mb-4 bg-red-50 border border-red-150 p-2.5 rounded-xl text-center">
            <p className="text-red-650 text-xs font-semibold">{error}</p>
          </div>
        )}

        {/* 2-column Pricing Grid */}
        <div className="grid md:grid-cols-2 gap-6 items-stretch mb-6 max-w-2xl mx-auto">

          {/* PLUS Monthly */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col hover:shadow-sm transition-all duration-300 relative overflow-hidden">
            {isStudentApproved && (
              <div className="absolute top-2 right-2 bg-emerald-50 text-emerald-600 border border-emerald-150 text-[8px] font-bold px-1.5 py-0.5 rounded">
                SV -30%
              </div>
            )}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Gói Plus</h3>
                <p className="text-slate-400 text-[9px] mt-0.5">Trải nghiệm nâng cao</p>
              </div>
              <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                <Star size={14} className="text-amber-400" />
              </div>
            </div>
            <div className="mb-3 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900">{plusMonthlyPrice.toLocaleString("vi-VN")}đ</span>
              <span className="text-slate-400 text-xs">/ tháng</span>
              {isStudentApproved && <span className="text-[10px] text-slate-400 line-through ml-1.5">69.000đ</span>}
            </div>
            <div className="space-y-2 mb-5 flex-1">
              {plusFeatures.map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center text-xs text-slate-600 font-medium">
                  {feat.includes("20 câu hỏi") ? (
                    <MessageCircle size={13} className="text-amber-500 flex-shrink-0" />
                  ) : (
                    <Check size={13} className="text-amber-500 flex-shrink-0" />
                  )}
                  <span>{feat}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {renderUpgradeButton("plus-month", plusMonthlyPrice, "Nâng cấp Plus", false)}
            </div>
          </div>

          {/* PRO Monthly (Recommended) */}
          <div className="bg-indigo-50/15 border-2 border-indigo-500 rounded-2xl p-5 flex flex-col relative shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-600 text-white text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow flex items-center gap-0.5 z-10">
              <Trophy size={8} fill="white" />
              Phổ biến nhất
            </div>
            {isStudentApproved && (
              <div className="absolute top-2 right-2 bg-emerald-50 text-emerald-600 border border-emerald-150 text-[8px] font-bold px-1.5 py-0.5 rounded z-10">
                SV -30%
              </div>
            )}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Gói Pro</h3>
                <p className="text-slate-500 text-[9px] mt-0.5">Không giới hạn AI</p>
              </div>
              <div className="p-1.5 bg-indigo-50 rounded-xl border border-indigo-200">
                <Zap size={14} className="text-indigo-600 fill-indigo-600" />
              </div>
            </div>
            <div className="mb-3 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-indigo-600">{proMonthlyPrice.toLocaleString("vi-VN")}đ</span>
              <span className="text-slate-400 text-xs">/ tháng</span>
              {isStudentApproved && <span className="text-[10px] text-slate-400 line-through ml-1.5">119.000đ</span>}
            </div>
            <div className="space-y-2 mb-5 flex-1">
              {proFeatures.map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center text-xs text-slate-700">
                  {feat.includes("Không giới hạn") ? (
                    <Sparkles size={13} className="text-indigo-600 flex-shrink-0 animate-pulse" />
                  ) : (
                    <Check size={13} className="text-indigo-600 flex-shrink-0" />
                  )}
                  <span className="font-semibold text-slate-900">{feat}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {renderUpgradeButton("month", proMonthlyPrice, "Nâng cấp Pro", true)}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row justify-between items-center gap-2 text-slate-400 text-[9px] text-center md:text-left">
          <div>
            <p className="font-bold text-slate-500 mb-0.5">Thanh toán bảo mật qua cổng PayOS</p>
            <p>Kích hoạt tức thì, không tự động gia hạn gói cước.</p>
          </div>
          <div className="flex gap-3 font-semibold text-slate-500">
            <div className="flex items-center gap-0.5">
              <Check size={11} />
              <span>Kích hoạt tự động</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Check size={11} />
              <span>Ví số dư an toàn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insufficient balance confirmation */}
      {showConfirmDeposit.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-white text-slate-800 border border-slate-100 rounded-3xl w-full max-w-sm p-6 shadow-xl text-center select-none animate-[scaleIn_0.15s_ease-out]">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-2">Số dư không đủ</h3>
            <p className="text-slate-505 text-xs leading-relaxed mb-6">
              Bạn không đủ tiền để mua gói này, có tiếp tục nạp tiền không?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDeposit({ show: false, amount: 0 })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-505 hover:bg-slate-50 hover:text-slate-800 font-bold text-xs transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onClose();
                  router.push(`/deposit?amount=${showConfirmDeposit.amount}`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-md shadow-indigo-100"
              >
                Có
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
