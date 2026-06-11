"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { paymentApi } from "@/lib/api";
import { Wallet, DollarSign, ArrowRight, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { getUser } from "@/lib/auth";
import PaymentResultModal from "@/components/payment/PaymentResultModal";

export default function DepositPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  
  const [amount, setAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [paymentResult, setPaymentResult] = useState<"success" | "cancel" | null>(null);

  const quickAmounts = [10000, 20000, 50000, 100000, 200000, 500000];

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const res = await paymentApi.getBalance();
      setBalance(res.balance);
    } catch (err) {
      console.error("Lỗi khi tải số dư:", err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await paymentApi.getTransactions();
      setTransactions(data || []);
    } catch (err) {
      console.error("Lỗi khi tải lịch sử nạp tiền:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    fetchBalance();
    fetchHistory();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      
      const amountParam = params.get("amount");
      if (amountParam) {
        const amt = Number(amountParam);
        if (!isNaN(amt) && amt >= 10000) {
          setAmount(amt);
          if (quickAmounts.includes(amt)) {
            setCustomAmount("");
          } else {
            setCustomAmount(amt.toString());
          }
        }
      }

      const payStatus = params.get("payment");
      if (payStatus === "success" || payStatus === "cancel") {
        setPaymentResult(payStatus);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#eef2fb] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const handleQuickSelect = (val: number) => {
    setAmount(val);
    setCustomAmount("");
    setErrorMsg("");
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmount(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      setAmount(num);
    }
    setErrorMsg("");
  };

  const handleCheckout = async () => {
    if (amount < 10000) {
      setErrorMsg("Số tiền nạp tối thiểu là 10.000 VND.");
      return;
    }

    setLoadingCheckout(true);
    setErrorMsg("");

    try {
      const res = await paymentApi.createDepositLink({
        amount: amount,
        returnUrl: `${window.location.origin}/payment/success?from=${encodeURIComponent("/deposit")}`,
        cancelUrl: `${window.location.origin}/payment/cancel?from=${encodeURIComponent("/deposit")}`,
      });

      if (res && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        throw new Error("Không nhận được liên kết thanh toán từ cổng PayOS.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Có lỗi xảy ra khi khởi tạo giao dịch. Vui lòng thử lại.");
      setLoadingCheckout(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#eef2fb]">
      <Sidebar />
      <div className="flex-1 ml-[72px]">
        <Navbar />
        <main className="pt-20 px-8 pb-12 max-w-4xl mx-auto select-none animate-[fadeIn_0.3s_ease-out]">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                Nạp tiền tài khoản
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Nạp tiền nhanh vào số dư tài khoản của bạn qua cổng quét mã QR PayOS tự động.
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
              <Sparkles size={13} className="text-blue-600 animate-pulse" />
              <span className="text-[10px] font-semibold text-blue-600">Giao dịch bảo mật 24/7</span>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl mb-6 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8 items-start">
            
            {/* Left side: Deposit Options */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Wallet Info */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden">
                <div className="absolute right-0 bottom-0 w-28 h-28 bg-blue-50/50 rounded-full blur-xl pointer-events-none" />
                <div className="z-10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Số dư hiện tại</span>
                  <span className="text-3xl font-black text-slate-900 mt-1.5 block">
                    {loadingBalance ? (
                      <span className="inline-block w-24 h-8 bg-slate-100 rounded animate-pulse" />
                    ) : (
                      `${(balance ?? 0).toLocaleString("vi-VN")} VND`
                    )}
                  </span>
                </div>
                <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <Wallet size={24} className="stroke-[1.5]" />
                </div>
              </div>

              {/* Amount Selection */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Chọn số tiền nạp nhanh
                </h3>
                
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {quickAmounts.map((val) => {
                    const isSelected = amount === val && !customAmount;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickSelect(val)}
                        className={`py-3.5 rounded-xl text-center text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.15)]"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {val.toLocaleString("vi-VN")}đ
                      </button>
                    );
                  })}
                </div>

                <div className="w-full h-px bg-slate-100 mb-6" />

                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Hoặc nhập số tiền tùy chọn (VND)
                </h3>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-450 font-bold text-sm text-slate-400">
                    đ
                  </div>
                  <input
                    type="number"
                    min={10000}
                    step={5000}
                    placeholder="Ví dụ: 150000"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700 font-bold"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  * Số tiền nạp tối thiểu là 10.000đ.
                </p>
              </div>

            </div>

            {/* Right side: Payment Summary Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Thông tin thanh toán
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Hình thức</span>
                  <span className="font-semibold text-slate-800">Quét mã QR PayOS</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Phí giao dịch</span>
                  <span className="font-semibold text-emerald-600">Miễn phí</span>
                </div>
                <div className="w-full h-px bg-slate-100 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Tổng thanh toán</span>
                  <span className="text-lg font-black text-blue-600">
                    {amount.toLocaleString("vi-VN")} VND
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loadingCheckout || amount < 10000}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingCheckout ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    Đang kết nối cổng PayOS...
                  </>
                ) : (
                  <>
                    Tiến hành nạp tiền
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-[9px] text-slate-400 leading-relaxed text-center">
                  Bằng việc tiến hành nạp tiền, bạn đồng ý với Điều khoản sử dụng và Chính sách giao dịch của ScrollTutor.
                </p>
              </div>
            </div>

          </div>

          {/* Lịch sử giao dịch */}
          <div className="mt-8 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Lịch sử giao dịch của bạn
            </h3>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">
                Đang tải lịch sử giao dịch...
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Chưa phát sinh giao dịch nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                      <th className="p-3">Mã đơn</th>
                      <th className="p-3">Khóa học / Dịch vụ</th>
                      <th className="p-3">Số tiền</th>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600">
                    {transactions.map((tx) => (
                      <tr key={tx.transactionId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-mono text-[10px] text-slate-400 font-bold">{tx.orderCode}</td>
                        <td className="p-3 font-semibold text-slate-700">{tx.courseTitle ?? "Nạp tiền tài khoản"}</td>
                        <td className={`p-3 font-bold ${tx.amount > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                          {tx.amount > 0 ? `+${tx.amount.toLocaleString("vi-VN")}đ` : `${tx.amount.toLocaleString("vi-VN")}đ`}
                        </td>
                        <td className="p-3 text-slate-400">
                          {new Date(tx.paymentTime).toLocaleString("vi-VN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                            tx.status === "SUCCESS"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-250"
                              : tx.status === "PENDING"
                              ? "bg-amber-50 text-amber-600 border-amber-250"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>

      {paymentResult && (
        <PaymentResultModal
          status={paymentResult}
          onClose={() => {
            setPaymentResult(null);
            fetchBalance();
            fetchHistory();
          }}
        />
      )}
    </div>
  );
}
