"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, clearAuth, saveUser } from "@/lib/auth";
import { User } from "@/lib/types";
import { paymentApi, enrollmentsApi, usersApi } from "@/lib/api";
import {
  LogOut, Mail, Shield, ShieldCheck, BookOpen, Award, Clock, Wallet, ArrowLeft, Loader2, Upload, CheckCircle2, AlertCircle, X, XCircle
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [coursesCount, setCoursesCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [proExpiration, setProExpiration] = useState<Date | null>(null);

  // Student verification states
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [reSubmitMode, setReSubmitMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);

    // Lấy số dư ví học viên
    setLoadingBalance(true);
    paymentApi.getBalance()
      .then(res => setBalance(res.balance))
      .catch(err => console.error("Lỗi lấy số dư:", err))
      .finally(() => setLoadingBalance(false));

    // Lấy số lượng khóa học đã đăng ký thực tế
    enrollmentsApi.getByUserDetails(u.id)
      .then(res => {
        const actualEnrollments = res.filter(e => e.courseSlug !== "pro-upgrade-month" && e.courseSlug !== "pro-upgrade-year" && e.courseSlug !== "system-deposit-balance");
        setCoursesCount(actualEnrollments.length);
        
        const hasPro = res.some(e => e.courseSlug === "pro-upgrade-month" || e.courseSlug === "pro-upgrade-year");
        setIsPro(hasPro);

        // Tính toán hạn PRO
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
      .catch(err => console.error("Lỗi lấy số lượng khóa học:", err));
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Chỉ chấp nhận file ảnh (PNG, JPG, JPEG, WEBP).");
      return;
    }
    setUploadError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await usersApi.uploadStudentCard(formData);
      if (res.success) {
        setUploadSuccess("Gửi bằng chứng thành công!");
        if (user) {
          const updatedUser: User = {
            ...user,
            studentVerificationStatus: "PENDING",
            studentCardPath: res.studentCardPath,
            hasSeenStudentRejection: false
          };
          saveUser(updatedUser);
          setUser(updatedUser);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setReSubmitMode(false);
      } else {
        setUploadError(res.message || "Tải lên thất bại. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Đã xảy ra lỗi khi tải lên bằng chứng.");
    } finally {
      setUploading(false);
    }
  };

  const getRemainingTimeStr = (expDate: Date) => {
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    if (diffMs <= 0) return "Đã hết hạn";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      return `Còn lại ${diffDays} ngày`;
    }
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours > 0) {
      return `Còn lại ${diffHours} giờ`;
    }
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `Còn lại ${diffMins} phút`;
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-[#eef2fb] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const initials = user.fullName
    ? user.fullName.split(" ").pop()?.charAt(0).toUpperCase() ?? "?"
    : "?";

  const roleLabel: Record<string, string> = {
    Student: "Học viên",
    Instructor: "Giảng viên",
    Admin: "Quản trị viên",
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483";

  return (
    <div className="ml-[72px] pt-14 min-h-screen bg-[#eef2fb] flex items-center justify-center">
      <div className="w-full max-w-md px-6 py-8 animate-[fadeIn_0.3s_ease-out] select-none">
        
        {/* Back Button */}
        <Link
          href={user.role === "Instructor" || user.role === "Admin" ? "/instructor/dashboard" : "/"}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-xs font-semibold mb-4 group inline-flex"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Quay lại Dashboard
        </Link>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden mb-6 relative">
          {/* Banner Gradient */}
          <div className="h-28 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </div>

          <div className="px-6 pb-6 relative">
            {/* Avatar & Logout button row */}
            <div className="flex justify-between items-end -mt-10 mb-5">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-white text-3xl font-extrabold select-none">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 hover:border-red-300 transition-all active:scale-95"
              >
                <LogOut size={13} />
                Đăng xuất
              </button>
            </div>

            {/* Profile Info */}
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{user.fullName}</h1>
              <span className="text-xs text-slate-400 font-medium block mt-1">{user.email}</span>

              {/* Badges */}
              <div className="flex flex-col gap-2 mt-3">
                <div className="flex gap-1.5 flex-wrap items-center">
                  <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-150 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {roleLabel[user.role] ?? user.role}
                  </span>
                  
                  {user.role === "Student" && (
                    <>
                      <span className={`text-[10px] border px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isPro 
                          ? "bg-purple-50 text-purple-600 border-purple-150" 
                          : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                      }`}>
                        {isPro ? "Gói PRO" : "Gói Free"}
                      </span>

                      {/* Student verification small button */}
                      {user.studentVerificationStatus === "APPROVED" ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1 select-none">
                          <ShieldCheck size={11} className="text-emerald-500" />
                          Đã xác minh thành công
                        </span>
                      ) : (
                        <button
                          onClick={() => setIsVerificationModalOpen(true)}
                          className={`text-[10px] border px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all ${
                            user.studentVerificationStatus === "PENDING"
                              ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100/60"
                              : user.studentVerificationStatus === "REJECTED"
                              ? "bg-red-50 text-red-650 border-red-200 hover:bg-red-100/60"
                              : "bg-slate-50 text-slate-655 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <Shield size={11} className={
                            user.studentVerificationStatus === "PENDING"
                              ? "text-amber-500 animate-pulse"
                              : user.studentVerificationStatus === "REJECTED"
                              ? "text-red-500"
                              : "text-slate-400"
                          } />
                          {user.studentVerificationStatus === "PENDING" && "Đang chờ xác minh"}
                          {user.studentVerificationStatus === "REJECTED" && "Xác minh bị từ chối"}
                          {(!user.studentVerificationStatus || user.studentVerificationStatus === "NONE") && "Xác minh sinh viên"}
                        </button>
                      )}
                    </>
                  )}
                </div>
                {user.role === "Student" && isPro && proExpiration && (
                  <span className="text-xs text-purple-655 font-semibold flex items-center gap-1 mt-0.5 bg-purple-50/70 border border-purple-100 rounded-lg px-2 py-1 max-w-fit">
                    <Clock size={12} className="stroke-[2.5] text-purple-500" />
                    PRO {getRemainingTimeStr(proExpiration)}
                  </span>
                )}
              </div>
            </div>

            {/* Balance Widget (Only for Students) */}
            {user.role === "Student" && (
              <>
                <div className="w-full h-px bg-slate-100 mb-6" />
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 w-16 h-16 bg-blue-50 rounded-full blur-lg pointer-events-none" />
                  <div className="z-10">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Số dư tài khoản</span>
                    <span className="text-lg font-black text-slate-800 mt-1 block">
                      {loadingBalance ? "..." : `${(balance ?? 0).toLocaleString("vi-VN")} VND`}
                    </span>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <Wallet size={18} className="stroke-[1.5]" />
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Stats Grid (Only for Students) */}
        {user.role === "Student" && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center hover:shadow-md hover:border-slate-200 transition-all">
              <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <BookOpen size={16} className="text-orange-400" />
              </div>
              <div className="text-lg font-bold text-slate-800 leading-none">{coursesCount}</div>
              <div className="text-[10px] text-slate-450 mt-1 font-semibold">Khóa học</div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center hover:shadow-md hover:border-slate-200 transition-all">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Award size={16} className="text-green-400" />
              </div>
              <div className="text-lg font-bold text-slate-800 leading-none">0</div>
              <div className="text-[10px] text-slate-450 mt-1 font-semibold">Chứng chỉ</div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-center hover:shadow-md hover:border-slate-200 transition-all">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Clock size={16} className="text-blue-400" />
              </div>
              <div className="text-lg font-bold text-slate-800 leading-none">0h</div>
              <div className="text-[10px] text-slate-450 mt-1 font-semibold">Học tập</div>
            </div>
          </div>
        )}

      </div>

      {/* Student Verification Modal */}
      {isVerificationModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setIsVerificationModalOpen(false)}
        >
          <div 
            className="relative bg-white text-slate-800 border border-slate-100 rounded-3xl w-full max-w-md p-6 shadow-xl select-none animate-[scaleIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsVerificationModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-150 transition-colors"
            >
              <X size={16} />
            </button>

            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-4">
              <Shield size={16} className="text-blue-600" />
              Xác minh Học sinh / Sinh viên
            </h2>

            {(!user.studentVerificationStatus || user.studentVerificationStatus === "NONE" || reSubmitMode) && (
              <div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Tải ảnh thẻ học sinh/sinh viên làm bằng chứng để nhận thêm <strong className="text-blue-600">30% ưu đãi</strong> khi đăng ký hoặc gia hạn các gói PRO.
                </p>
                
                <div className="relative border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 transition-colors flex flex-col items-center justify-center bg-slate-50/50 cursor-pointer min-h-[120px] group">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    id="student-card-upload"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  
                  {previewUrl ? (
                    <div className="w-full flex flex-col items-center gap-2">
                      <img src={previewUrl} alt="Preview" className="max-h-24 rounded-lg object-contain border shadow-sm" />
                      <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[200px]">
                        {selectedFile?.name}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2 group-hover:scale-110 transition-transform">
                        <Upload size={18} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Chọn ảnh thẻ học sinh/sinh viên</span>
                      <span className="text-[10px] text-slate-400 mt-1">Hỗ trợ JPG, PNG, WEBP</span>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="flex items-center gap-1.5 mt-3 text-red-500 text-xs font-semibold">
                    <AlertCircle size={14} />
                    {uploadError}
                  </div>
                )}

                {uploadSuccess && (
                  <div className="flex items-center gap-1.5 mt-3 text-green-600 text-xs font-semibold">
                    <CheckCircle2 size={14} />
                    {uploadSuccess}
                  </div>
                )}

                {selectedFile && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleUploadSubmit}
                      disabled={uploading}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {uploading ? <Loader2 size={13} className="animate-spin" /> : null}
                      Gửi bằng chứng
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setUploadError(null);
                        setReSubmitMode(false);
                      }}
                      disabled={uploading}
                      className="px-3 py-2 border border-slate-200 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            )}

            {user.studentVerificationStatus === "PENDING" && !reSubmitMode && (
              <div className="flex flex-col gap-4">
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-800">Đang chờ xác minh</h3>
                    <p className="text-[11px] text-amber-700 mt-1 leading-normal">
                      Bằng chứng học sinh, sinh viên của bạn đang được duyệt. Quá trình này có thể mất tới 24h.
                    </p>
                    {user.studentCardPath && (
                      <a
                        href={apiUrl + user.studentCardPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-600 hover:underline font-bold mt-2 block"
                      >
                        Xem bằng chứng đã gửi
                      </a>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-800 font-semibold leading-relaxed">
                      Bạn đã gửi xác minh trước đó, có muốn gửi lại không?
                    </p>
                  </div>
                  <button
                    onClick={() => setReSubmitMode(true)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5"
                  >
                    Có, gửi lại
                  </button>
                </div>
              </div>
            )}

            {user.studentVerificationStatus === "REJECTED" && !reSubmitMode && (
              <div className="bg-red-50/70 border border-red-200/80 rounded-2xl p-4 flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <XCircle size={16} className="stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-red-800">Đơn xác minh bị từ chối</h3>
                  <p className="text-[11px] text-red-700 mt-1 leading-normal">
                    Yêu cầu xác minh của bạn đã bị từ chối. Vui lòng nộp lại hình ảnh bằng chứng hợp lệ khác.
                  </p>
                  <button
                    onClick={() => setReSubmitMode(true)}
                    className="mt-3 px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors active:scale-95"
                  >
                    Nộp lại bằng chứng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}