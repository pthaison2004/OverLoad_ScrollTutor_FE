"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, Zap, Loader2, Sparkles, Trophy, Star, Wallet, AlertCircle, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { paymentApi, enrollmentsApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import PaymentResultModal from "@/components/payment/PaymentResultModal";

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [paymentResult, setPaymentResult] = useState<"success" | "cancel" | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [showConfirmDeposit, setShowConfirmDeposit] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });
  const [proExpiration, setProExpiration] = useState<Date | null>(null);

  const user = getUser();
  const isStudentApproved = user?.studentVerificationStatus === "APPROVED";
  const monthlyPrice = isStudentApproved ? 48300 : 69000;
  const yearlyPrice = isStudentApproved ? 419300 : 599000;

  useEffect(() => {
    setMounted(true);

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

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const payStatus = params.get("payment");
      if (payStatus === "success" || payStatus === "cancel") {
        setPaymentResult(payStatus);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  const handleUpgrade = async (packageType: "month" | "year") => {
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(packageType);
    setError("");

    try {
      const res = await paymentApi.createProLink({
        packageType,
        returnUrl: `${window.location.origin}/payment/success?from=${encodeURIComponent("/pricing")}`,
        cancelUrl: `${window.location.origin}/payment/cancel?from=${encodeURIComponent("/pricing")}`,
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
      setPaymentResult("success");
      const updatedBalance = await paymentApi.getBalance();
      setBalance(updatedBalance.balance);

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
        .catch(err => console.error(err));
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi thanh toán bằng số dư. Vui lòng thử lại.");
    } finally {
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 relative overflow-hidden flex flex-col items-center py-12 px-4 select-none">
      {/* Decorative background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-50 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-10 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Quay lại Trang chủ
        </Link>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
          <Sparkles size={14} className="text-amber-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-600">Nâng cấp để bứt phá giới hạn</span>
          {isStudentApproved && (
            <>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-250 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-500" />
                Học sinh/Sinh viên (-30%)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Intro */}
      <div className="text-center max-w-2xl mb-10 z-10">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
          Nâng cấp tài khoản PRO
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Đầu tư một lần, mở khóa toàn bộ kho tàng kiến thức nâng cao. Đạt được mục tiêu nghề nghiệp nhanh gấp đôi.
        </p>
      </div>

      {proExpiration && (
        <div className="w-full max-w-md mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-3 shadow-sm text-left animate-[fadeIn_0.2s_ease-out] z-10">
          <div className="p-2.5 bg-indigo-100/60 rounded-xl text-indigo-600 shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Bạn đang sở hữu gói PRO</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Thời gian còn lại: <span className="font-semibold text-indigo-600">{getRemainingTimeString(proExpiration)}</span> (hết hạn ngày {proExpiration.toLocaleDateString("vi-VN")})
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="w-full max-w-md mb-6 bg-red-50 border border-red-200 p-4 rounded-2xl text-center z-10">
          <p className="text-red-650 text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Pricing Cards Container */}
      <div className="w-full max-w-3xl grid md:grid-cols-2 gap-6 mb-12 z-10 items-stretch">
        
        {/* Package 1: Monthly */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col hover:shadow-md transition-all duration-300 group relative overflow-hidden">
          {isStudentApproved && (
            <div className="absolute top-2 right-2 bg-emerald-50 text-emerald-600 border border-emerald-150 text-[9px] font-bold px-2 py-0.5 rounded">
              Sinh viên -30%
            </div>
          )}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Gói 1 Tháng</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Trải nghiệm không giới hạn</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
              <Star size={18} className="text-slate-400" />
            </div>
          </div>

          <div className="mb-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900">
              {monthlyPrice.toLocaleString("vi-VN")}đ
            </span>
            <span className="text-slate-400 text-xs">/ tháng</span>
            {isStudentApproved && (
              <span className="text-[11px] text-slate-400 line-through ml-1.5">69.000đ</span>
            )}
          </div>

          <div className="space-y-3 mb-6 flex-1">
            {proFeatures.map((feat, idx) => (
              <div key={idx} className="flex gap-2.5 items-center text-xs text-slate-655">
                <Check size={14} className="text-indigo-600 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {!getUser() ? (
              <button
                onClick={() => router.push("/login")}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2"
              >
                Đăng nhập để nâng cấp
              </button>
            ) : balance !== null ? (
              balance >= monthlyPrice ? (
                <button
                  onClick={() => handleUpgradeWithBalance("month")}
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 ${
                    proExpiration
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_4px_12px_rgba(220,38,38,0.15)]"
                      : "bg-slate-900 hover:bg-slate-800 text-white shadow-[0_4px_12px_rgba(15,23,42,0.1)]"
                  }`}
                >
                  {loading === "month-balance" ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <Wallet size={14} className="shrink-0" />
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
                  className={`w-full py-2.5 rounded-xl border backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-sm ${
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
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-2"
              >
                <Loader2 size={14} className="animate-spin text-slate-400" />
                Đang tải số dư...
              </button>
            )}
          </div>
        </div>

        {/* Package 2: Yearly (Recommended) */}
        <div className="bg-indigo-50/10 border-2 border-indigo-500 rounded-3xl p-6 flex flex-col relative shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          {/* Popular Tag */}
          <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-600 text-white text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow flex items-center gap-1 z-10">
            <Trophy size={10} fill="white" />
            Phổ biến nhất
          </div>

          {isStudentApproved && (
            <div className="absolute top-2 right-2 bg-emerald-50 text-emerald-600 border border-emerald-150 text-[9px] font-bold px-2 py-0.5 rounded z-10">
              Sinh viên -30%
            </div>
          )}

          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                Gói 1 Năm
                <span className="text-[9px] bg-indigo-100 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                  {isStudentApproved ? "Tiết kiệm 49%" : "Tiết kiệm 27%"}
                </span>
              </h3>
              <p className="text-slate-500 text-[10px] mt-0.5">Lộ trình đột phá toàn diện</p>
            </div>
            <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200">
              <Zap size={18} className="text-indigo-600 fill-indigo-600" />
            </div>
          </div>

          <div className="mb-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-indigo-600">
              {yearlyPrice.toLocaleString("vi-VN")}đ
            </span>
            <span className="text-slate-400 text-xs">/ 12 tháng</span>
            {isStudentApproved && (
              <span className="text-[11px] text-slate-400 line-through ml-1.5">599.000đ</span>
            )}
          </div>

          <div className="space-y-3 mb-6 flex-1">
            {proFeatures.map((feat, idx) => (
              <div key={idx} className="flex gap-2.5 items-center text-xs text-slate-700">
                <Check size={14} className="text-indigo-600 flex-shrink-0" />
                <span className="font-semibold text-slate-900">{feat}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {!getUser() ? (
              <button
                onClick={() => router.push("/login")}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2"
              >
                Đăng nhập để nâng cấp
              </button>
            ) : balance !== null ? (
              balance >= yearlyPrice ? (
                <button
                  onClick={() => handleUpgradeWithBalance("year")}
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 ${
                    proExpiration
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-100"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100"
                  }`}
                >
                  {loading === "year-balance" ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <Wallet size={14} className="shrink-0 text-white" />
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
                  className={`w-full py-2.5 rounded-xl border backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-sm ${
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
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 animate-pulse"
              >
                <Loader2 size={14} className="animate-spin text-slate-400" />
                Đang tải số dư...
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Trust Badges / Info */}
      <div className="w-full max-w-3xl border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-xs text-center md:text-left z-10">
        <div>
          <p className="font-bold text-slate-500 mb-0.5">Thanh toán an toàn bảo mật qua cổng PayOS</p>
          <p>Mã hóa thông tin giao dịch, quét mã QR chuyển khoản tự động 24/7.</p>
        </div>
        <div className="flex gap-4 font-semibold text-slate-500">
          <div className="flex items-center gap-1">
            <Check size={14} />
            <span>Kích hoạt ngay lập tức</span>
          </div>
          <div className="flex items-center gap-1">
            <Check size={14} />
            <span>Không tự động gia hạn</span>
          </div>
        </div>
      </div>

      {paymentResult && (
        <PaymentResultModal
          status={paymentResult}
          onClose={() => setPaymentResult(null)}
        />
      )}
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
