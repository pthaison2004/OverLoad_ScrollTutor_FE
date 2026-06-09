"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usersApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { 
  Shield, AlertCircle, Loader2, ArrowLeft, Check, X, ExternalLink, Image as ImageIcon, User
} from "lucide-react";

interface PendingVerification {
  id: number;
  fullName: string;
  email: string;
  avatarUrl?: string;
  studentCardPath: string;
  updatedAt: string;
}

export default function StudentVerificationsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pendingList, setPendingList] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await usersApi.getPendingStudentVerifications();
      setPendingList(res || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể tải danh sách yêu cầu xác minh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const user = getUser();
    if (!user || (user.role !== "Admin" && user.role !== "Instructor")) {
      router.push("/");
      return;
    }
    fetchPending();
  }, [router]);

  const handleVerify = async (userId: number, action: "approve" | "reject") => {
    setProcessingId(userId);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await usersApi.verifyStudent(userId, action);
      if (res.success) {
        setSuccessMsg(res.message);
        setPendingList(prev => prev.filter(item => item.id !== userId));
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(res.message || "Xử lý thất bại.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Có lỗi xảy ra khi cập nhật trạng thái.");
    } finally {
      setProcessingId(null);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483";

  return (
    <div className="p-8 max-w-5xl mx-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/instructor/dashboard"
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-xs font-semibold mb-3 group inline-flex"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Quay lại Dashboard
          </Link>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Shield size={22} className="text-blue-600" />
            Duyệt Xác minh Học sinh / Sinh viên
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Xem xét thông tin và bằng chứng hình ảnh thẻ học sinh, sinh viên để cấp quyền ưu đãi giảm giá 30%.
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50/70 border border-red-200 text-red-600 rounded-xl mb-6 text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-emerald-50/70 border border-emerald-200 text-emerald-600 rounded-xl mb-6 text-xs font-semibold">
          <Check size={16} className="shrink-0 mt-0.5 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
          Đang tải danh sách yêu cầu...
        </div>
      ) : pendingList.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-200 rounded-3xl text-center text-slate-400 text-xs bg-white shadow-sm flex flex-col items-center justify-center gap-2.5">
          <Shield size={24} className="text-slate-300" />
          <p className="font-bold text-slate-700">Chưa có yêu cầu nào cần duyệt</p>
          <p className="text-[10px] text-slate-400">Các yêu cầu xác minh sinh viên mới của học viên sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#fcfdfe] border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Học viên</th>
                  <th className="p-4">Ảnh bằng chứng</th>
                  <th className="p-4">Thời gian gửi</th>
                  <th className="p-4 text-center w-48">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600">
                {pendingList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 border flex items-center justify-center text-blue-600 shrink-0 overflow-hidden">
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt={item.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <User size={14} />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-tight">{item.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {item.studentCardPath ? (
                        <div className="flex items-center gap-2">
                          <div 
                            onClick={() => setZoomedImage(apiUrl + item.studentCardPath)}
                            className="w-14 h-10 rounded-lg border bg-slate-50 overflow-hidden cursor-zoom-in relative group flex items-center justify-center shrink-0"
                          >
                            <img 
                              src={apiUrl + item.studentCardPath} 
                              alt="Student Card Proof" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ImageIcon size={12} className="text-white" />
                            </div>
                          </div>
                          <a 
                            href={apiUrl + item.studentCardPath}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-0.5 font-bold"
                          >
                            Mở thẻ mới <ExternalLink size={10} />
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Không có ảnh</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 font-medium">
                      {new Date(item.updatedAt).toLocaleString("vi-VN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleVerify(item.id, "approve")}
                          disabled={processingId !== null}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {processingId === item.id ? (
                            <Loader2 size={12} className="animate-spin text-emerald-600" />
                          ) : (
                            <Check size={12} className="stroke-[2.5]" />
                          )}
                          Đồng ý
                        </button>
                        <button
                          onClick={() => handleVerify(item.id, "reject")}
                          disabled={processingId !== null}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {processingId === item.id ? (
                            <Loader2 size={12} className="animate-spin text-red-650" />
                          ) : (
                            <X size={12} className="stroke-[2.5]" />
                          )}
                          Từ Chiếu
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm cursor-zoom-out animate-[fadeIn_0.15s_ease-out]"
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border bg-white select-none cursor-default animate-[scaleIn_0.15s_ease-out]" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-1.5 bg-white/80 hover:bg-white border rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow z-10"
            >
              <X size={16} />
            </button>
            <img src={zoomedImage} alt="Zoomed Proof" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
