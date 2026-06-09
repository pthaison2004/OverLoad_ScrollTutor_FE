"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Zap, Loader2, Sparkles, Trophy, Star, Wallet, AlertCircle, Clock, ShieldCheck } from "lucide-react";
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
  const [proExpiration, setProExpiration] = useState<Date | null>(null);

  const user = getUser();
  const isStudentApproved = user?.studentVerificationStatus === "APPROVED";
  const monthlyPrice = isStudentApproved ? 48300 : 69000;
  const yearlyPrice = isStudentApproved ? 419300 : 599000;

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";

    if (user) {
      paymentApi.getBalance()
        .then(res => setBalance(res.balance))
        .catch(err => console.error(err));

      enrollmentsApi.getByUserDetails(user.id)
        .then(res => {
          const proEnrollments = res
            .filter(e => e.courseSlug === "pro-upgrade-month" || e.courseSlug === "pro-upgrade-year")
            .map(e => ({
              enrolledAt: new Date(e.enrolledAt),
              durationDays: e.courseSlug === "pro-upgrade-month" ? 30 : 365
            }))
            .sort((a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime());

          if (proEnrollments.length > 0) {
            let expiration: Date | null = null;
            for (const item of proEnrollments) {
              if (expiration === null || expiration < item.enrolledAt) {
                expiration = new Date(item.enrolledAt.getTime() + item.durationDays * 24 * 60 * 60 * 1000);
              } else {
                expiration = new Date(expiration.getTime() + item.durationDays * 24 * 60 * 60 * 1000);
              }
            }
            if (expiration && expiration > new Date()) {
              setProExpiration(expiration);
            }
          }
        })
        .catch(err => console.error("Lỗi lấy thông tin gói PRO:", err));
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
    
    if (diffDays > 0) {
      return `${diffDays} ngày ${diffHours} giờ`;
    }
    return `${diffHours} giờ`;
  };

  if (!mounted) return null;

  const handleUpgrade = async (packageType: "month" | "year") => {
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(packageType);
    setError("");

    try {
      const fromPath = typeof window !== "undefined" ? window.location.pathname : "/";
      const res = await paymentApi.createProLink({
        packageType,
        returnUrl: `${window.location.origin}/payment/success?from=${encodeURIComponent(fromPath)}`,
        cancelUrl: `${window.location.origin}/payment/cancel?from=${encodeURIComponent(fromPath)}`,
      });

      if (res && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        throw new Error("Không thể tạo liên kết thanh toán PRO.");
      }
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi kết nối tới cổng thanh toán. Vui lòng thử lại.");
      setLoading(null);
    }
  };

  const handleUpgradeWithBalance = async (packageType: "month" | "year") => {
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(packageType + "-balance");
    setError("");

    try {
      await paymentApi.buyProWithBalance({ packageType });
      onClose();
      router.replace(window.location.pathname + "?payment=success");
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi thanh toán bằng số dư. Vui lòng thử lại.");
      setLoading(null);
    }
  };

  const proFeatures = [
    "Mở khóa toàn bộ khóa học Premium nâng cao",
    "Học tương tác Scrollytelling & Visualizer",
    "Tải xuống toàn bộ mã nguồn dự án mẫu",
    "Hỗ trợ giải đáp thắc mắc 1:1 từ Giảng viên",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      {/* Modal Box */}
      <div
        className="relative bg-white text-slate-800 border border-slate-100 rounded-3xl w-full max-w-3xl p-6 md:p-8 shadow-xl relative select-none animate-[scaleIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-150 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full mb-2.5">
            <Sparkles size={11} className="text-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-600">Nâng cấp tài khoản PRO</span>
            {isStudentApproved && (
              <>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-500" />
                  Học sinh/Sinh viên (-30%)
                </span>
              </>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            Nâng cấp tài khoản PRO
          </h2>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Đầu tư một lần để mở khóa toàn bộ kiến thức lập trình tương tác nâng cao và tính năng đặc quyền.
          </p>
        </div>

        {proExpiration && (
          <div className="max-w-md mx-auto mb-5 p-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-2.5 shadow-sm text-left animate-[fadeIn_0.2s_ease-out]">
            <div className="p-2 bg-indigo-100/60 rounded-xl text-indigo-600 shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Bạn đang sở hữu gói PRO</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Thời gian còn lại: <span className="font-semibold text-indigo-600">{getRemainingTimeString(proExpiration)}</span> (hết hạn ngày {proExpiration.toLocaleDateString("vi-VN")})
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto mb-4 bg-red-50 border border-red-150 p-2.5 rounded-xl text-center">
            <p className="text-red-600 text-xs font-semibold">{error}</p>
          </div>
        )}

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-2 gap-5 items-stretch mb-6">
          
          {/* Monthly Package */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col hover:shadow-sm transition-all duration-300 relative overflow-hidden">
            {isStudentApproved && (
              <div className="absolute top-2 right-2 bg-emerald-50 text-emerald-600 border border-emerald-150 text-[8px] font-bold px-1.5 py-0.5 rounded">
                Sinh viên -30%
              </div>
            )}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Gói 1 Tháng</h3>
                <p className="text-slate-400 text-[9px] mt-0.5">Mở khóa trải nghiệm ngắn hạn</p>
              </div>
              <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                <Star size={14} className="text-slate-400" />
              </div>
            </div>

            <div className="mb-3 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {monthlyPrice.toLocaleString("vi-VN")}đ
              </span>
              <span className="text-slate-400 text-xs">/ tháng</span>
              {isStudentApproved && (
                <span className="text-[10px] text-slate-400 line-through ml-1.5">69.000đ</span>
              )}
            </div>

            <div className="space-y-2 mb-5 flex-1">
              {proFeatures.map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center text-xs text-slate-600">
                  <Check size={13} className="text-indigo-600 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {!getUser() ? (
                <button
                  onClick={() => {
                    onClose();
                    router.push("/login");
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5"
                >
                  Đăng nhập để nâng cấp
                </button>
              ) : balance !== null ? (
                balance >= monthlyPrice ? (
                  <button
                    onClick={() => handleUpgradeWithBalance("month")}
                    disabled={loading !== null}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      proExpiration 
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_4px_12px_rgba(220,38,38,0.15)]"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-[0_4px_12px_rgba(15,23,42,0.1)]"
                    }`}
                  >
                    {loading === "month-balance" ? (
                      <Loader2 size={13} className="animate-spin text-white" />
                    ) : (
                      <Wallet size={13} className="shrink-0" />
                    )}
                    {proExpiration 
                      ? `Gia hạn PRO - ${monthlyPrice.toLocaleString("vi-VN")}đ (Số dư ví)` 
                      : `Nâng cấp PRO - ${monthlyPrice.toLocaleString("vi-VN")}đ (Số dư ví)`
                    }
                  </button>
                ) : (
                  <button
                    onClick={() => setShowConfirmDeposit({ show: true, amount: monthlyPrice })}
                    disabled={loading !== null}
                    className={`w-full py-2 rounded-xl border backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-sm ${
                      proExpiration
                        ? "bg-red-500/10 hover:bg-red-500/20 border-red-300/30 text-red-600 hover:text-red-800"
                        : "bg-slate-200/20 hover:bg-slate-200/35 border-slate-300/30 text-slate-650 hover:text-slate-850"
                    }`}
                  >
                    <Wallet size={14} className={`shrink-0 ${proExpiration ? "text-red-500" : "text-slate-400"}`} />
                    <div className="flex flex-col items-center text-center">
                      <span className="font-bold text-xs">{proExpiration ? "Gia hạn gói tháng" : "Nâng cấp gói tháng"}</span>
                      <span className={`text-[9px] font-medium mt-0.5 ${proExpiration ? "text-red-500/80" : "text-slate-500"}`}>
                        Số dư trong ví hiện không đủ
                      </span>
                    </div>
                  </button>
                )
              ) : (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Loader2 size={13} className="animate-spin text-slate-400" />
                  Đang tải số dư...
                </button>
              )}
            </div>
          </div>

          {/* Yearly Package */}
          <div className="bg-indigo-50/15 border-2 border-indigo-500 rounded-2xl p-5 flex flex-col relative shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            {/* Tag */}
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-600 text-white text-[8px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow flex items-center gap-0.5 z-10">
              <Trophy size={8} fill="white" />
              Phổ biến nhất
            </div>

            {isStudentApproved && (
              <div className="absolute top-2 right-2 bg-emerald-50 text-emerald-600 border border-emerald-150 text-[8px] font-bold px-1.5 py-0.5 rounded z-10">
                Sinh viên -30%
              </div>
            )}

            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1">
                  Gói 1 Năm
                  <span className="text-[8px] bg-indigo-100 border border-indigo-200 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">
                    {isStudentApproved ? "-49%" : "-27%"}
                  </span>
                </h3>
                <p className="text-slate-500 text-[9px] mt-0.5">Lộ trình học tập trọn vẹn</p>
              </div>
              <div className="p-1.5 bg-indigo-50 rounded-xl border border-indigo-200">
                <Zap size={14} className="text-indigo-600 fill-indigo-600" />
              </div>
            </div>

            <div className="mb-3 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-indigo-600">
                {yearlyPrice.toLocaleString("vi-VN")}đ
              </span>
              <span className="text-slate-400 text-xs">/ 12 tháng</span>
              {isStudentApproved && (
                <span className="text-[10px] text-slate-400 line-through ml-1.5">599.000đ</span>
              )}
            </div>

            <div className="space-y-2 mb-5 flex-1">
              {proFeatures.map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center text-xs text-slate-700">
                  <Check size={13} className="text-indigo-600 flex-shrink-0" />
                  <span className="font-semibold text-slate-900">{feat}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {!getUser() ? (
                <button
                  onClick={() => {
                    onClose();
                    router.push("/login");
                  }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5"
                >
                  Đăng nhập để nâng cấp
                </button>
              ) : balance !== null ? (
                balance >= yearlyPrice ? (
                  <button
                    onClick={() => handleUpgradeWithBalance("year")}
                    disabled={loading !== null}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      proExpiration
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-105"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-105"
                    }`}
                  >
                    {loading === "year-balance" ? (
                      <Loader2 size={13} className="animate-spin text-white" />
                    ) : (
                      <Wallet size={13} className="shrink-0 text-white" />
                    )}
                    {proExpiration 
                      ? `Gia hạn PRO - ${yearlyPrice.toLocaleString("vi-VN")}đ (Số dư ví)`
                      : `Nâng cấp PRO - ${yearlyPrice.toLocaleString("vi-VN")}đ (Số dư ví)`
                    }
                  </button>
                ) : (
                  <button
                    onClick={() => setShowConfirmDeposit({ show: true, amount: yearlyPrice })}
                    disabled={loading !== null}
                    className={`w-full py-2 rounded-xl border backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-sm ${
                      proExpiration
                        ? "bg-red-500/10 hover:bg-red-500/20 border-red-300/30 text-red-600 hover:text-red-800"
                        : "bg-slate-200/20 hover:bg-slate-200/35 border-slate-300/30 text-indigo-600 hover:text-indigo-800"
                    }`}
                  >
                    <Wallet size={14} className={`shrink-0 ${proExpiration ? "text-red-500" : "text-indigo-400"}`} />
                    <div className="flex flex-col items-center text-center">
                      <span className="font-bold text-xs">{proExpiration ? "Gia hạn gói năm" : "Nâng cấp gói năm"}</span>
                      <span className={`text-[9px] font-medium mt-0.5 ${proExpiration ? "text-red-500/80" : "text-indigo-500/80"}`}>
                        Số dư trong ví hiện không đủ
                      </span>
                    </div>
                  </button>
                )
              ) : (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 animate-pulse"
                >
                  <Loader2 size={13} className="animate-spin text-slate-400" />
                  Đang tải số dư...
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="border-t border-slate-100 pt-4 flex flex-col md:flex-row justify-between items-center gap-2 text-slate-400 text-[9px] text-center md:text-left">
          <div>
            <p className="font-bold text-slate-500 mb-0.5">Thanh toán bảo mật qua cổng PayOS</p>
            <p>Học trực quan tức thì, không tự động gia hạn gói cước.</p>
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
      {showConfirmDeposit.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-white text-slate-800 border border-slate-100 rounded-3xl w-full max-w-sm p-6 shadow-xl text-center select-none animate-[scaleIn_0.15s_ease-out]">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-2">Số dư không đủ</h3>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              Bạn không đủ tiền để mua khóa học, có tiếp tục nạp tiền không?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDeposit({ show: false, amount: 0 })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-bold text-xs transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onClose();
                  router.push(`/deposit?amount=${showConfirmDeposit.amount}`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-md shadow-indigo-105"
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
