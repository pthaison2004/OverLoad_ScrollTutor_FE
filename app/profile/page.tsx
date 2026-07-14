"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, clearAuth, saveUser } from "@/lib/auth";
import { User, UserCourse } from "@/lib/types";
import { paymentApi, enrollmentsApi, usersApi } from "@/lib/api";
import {
  LogOut, Mail, Shield, ShieldCheck, BookOpen, Award, Clock, Wallet, ArrowLeft, Loader2, Upload, CheckCircle2, AlertCircle, X, XCircle, ChevronRight, BookOpenCheck, Zap
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [proExpiration, setProExpiration] = useState<Date | null>(null);
  const [activePlan, setActivePlan] = useState<"FREE" | "PLUS" | "PRO">("FREE");


  // My Courses and Progress
  const [myCourses, setMyCourses] = useState<UserCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseTab, setCourseTab] = useState<"studying" | "completed">("studying");

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

    // Lấy danh sách khóa học kèm tiến độ từ API me
    setLoadingCourses(true);
    usersApi.getMyCoursesWithProgress()
      .then(res => {
        // Lọc bỏ các sản phẩm hệ thống (ví dụ: nạp tiền, nâng cấp gói)
        const actualCourses = res.filter(c => c.category?.toLowerCase() !== "system");
        setMyCourses(actualCourses);
      })
      .catch(err => console.error("Lỗi lấy danh sách khóa học:", err))
      .finally(() => setLoadingCourses(false));

    // Kiểm tra gói dịch vụ qua danh sách hóa đơn chi tiết
    enrollmentsApi.getByUserDetails(u.id)
      .then(res => {
        const subscriptionEnrollments = res
          .filter(e => e.courseSlug === "pro-upgrade-month" || e.courseSlug === "pro-upgrade-year" || e.courseSlug === "plus-upgrade-month")
          .map(e => ({
            enrolledAt: new Date(e.enrolledAt),
            durationDays: e.courseSlug.includes("year") ? 365 : 30,
            isPro: e.courseSlug.includes("pro-upgrade"),
            isPlus: e.courseSlug.includes("plus-upgrade"),
          }))
          .sort((a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime());

        let foundPlan: "FREE" | "PLUS" | "PRO" = "FREE";
        let foundExpiration: Date | null = null;

        for (const planType of ["PRO", "PLUS"] as const) {
          const planEnrollments = subscriptionEnrollments.filter(e => planType === "PRO" ? e.isPro : e.isPlus);
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
              foundPlan = planType;
              foundExpiration = expiration;
              break;
            }
          }
        }

        setActivePlan(foundPlan);
        setIsPro(foundPlan === "PRO");
        setProExpiration(foundExpiration);
      })
      .catch(err => console.error("Lỗi lấy thông tin gói học:", err));
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
      <div className="min-h-screen bg-[#f4f7fe] flex items-center justify-center">
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

  // Phân chia danh mục khóa học
  const studyingCourses = myCourses.filter(c => !c.isCompleted && c.progressPercentage < 100);
  const completedCourses = myCourses.filter(c => c.isCompleted || c.progressPercentage >= 100);

  // Ý tưởng hệ thống Huy hiệu gamification
  const badges = [
    {
      id: "journey_start",
      title: "Học viên mới",
      description: "Đăng ký thành công khóa học đầu tiên.",
      icon: "🎓",
      color: "bg-blue-100 text-blue-600",
      unlocked: myCourses.length > 0
    },
    {
      id: "pro_scholar",
      title: "Premium Scholar",
      description: "Nâng cấp và sở hữu gói học PRO chất lượng cao.",
      icon: "💎",
      color: "bg-purple-100 text-purple-600",
      unlocked: isPro
    },
    {
      id: "verified_identity",
      title: "Học sinh ưu tú",
      description: "Xác minh thẻ học sinh/sinh viên thành công.",
      icon: "🛡️",
      color: "bg-amber-100 text-amber-600",
      unlocked: user.studentVerificationStatus === "APPROVED"
    },
    {
      id: "code_warrior",
      title: "Chiến thần Code",
      description: "Hoàn thành xuất sắc tối thiểu một khóa học.",
      icon: "🚀",
      color: "bg-emerald-100 text-emerald-600",
      unlocked: completedCourses.length > 0
    }
  ];

  return (
    <div className="ml-[72px] pt-14 min-h-screen bg-[#f4f7fe]">
      <div className="w-full max-w-7xl mx-auto px-6 py-8 animate-[fadeIn_0.3s_ease-out] select-none">
        
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Hồ sơ cá nhân</h1>
            <p className="text-sm text-slate-400 font-medium">Theo dõi tiến độ học tập và quản lý tài khoản của bạn</p>
          </div>
          <Link
            href={user.role === "Instructor" || user.role === "Admin" ? "/instructor/dashboard" : "/"}
            className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl text-slate-650 text-xs font-bold hover:bg-slate-50 border border-slate-200/60 shadow-sm transition-all hover:shadow active:scale-95 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Quay lại Dashboard
          </Link>
        </div>

        {/* Dashboard grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Content Pane (75%) */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Stats Summary Panel */}
            {user.role === "Student" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-450 font-bold uppercase tracking-wider block">Khóa học đăng ký</span>
                    <span className="text-2xl font-black text-slate-800 mt-0.5 block">{myCourses.length}</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpenCheck size={22} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-455 font-bold uppercase tracking-wider block">Khóa học hoàn thành</span>
                    <span className="text-2xl font-black text-slate-800 mt-0.5 block">{completedCourses.length}</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                    <Award size={22} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-450 font-bold uppercase tracking-wider block">Huy hiệu đạt được</span>
                    <span className="text-2xl font-black text-slate-800 mt-0.5 block">
                      {badges.filter(b => b.unlocked).length} / {badges.length}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Courses section */}
            {user.role === "Student" && (
              <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
                  <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                    <BookOpen className="text-blue-500" size={20} />
                    Khóa học của bạn
                  </h2>
                  
                  {/* Tabs switch */}
                  <div className="flex bg-slate-100/80 p-1 rounded-xl">
                    <button
                      onClick={() => setCourseTab("studying")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        courseTab === "studying" 
                          ? "bg-white text-slate-800 shadow-sm" 
                          : "text-slate-500 hover:text-slate-850"
                      }`}
                    >
                      Đang học ({studyingCourses.length})
                    </button>
                    <button
                      onClick={() => setCourseTab("completed")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        courseTab === "completed" 
                          ? "bg-white text-slate-800 shadow-sm" 
                          : "text-slate-500 hover:text-slate-855"
                      }`}
                    >
                      Đã hoàn thành ({completedCourses.length})
                    </button>
                  </div>
                </div>

                {loadingCourses ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                    <span className="text-xs font-medium">Đang tải tiến độ học tập...</span>
                  </div>
                ) : (courseTab === "studying" ? studyingCourses : completedCourses).length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100/80 rounded-full flex items-center justify-center text-slate-350 mb-3">
                      <BookOpen size={28} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Chưa có khóa học nào trong danh sách này</p>
                    <p className="text-xs text-slate-400 mt-1">Hãy đăng ký học và thực hành để bắt đầu chặng đường phát triển kỹ năng.</p>
                    <Link
                      href="/"
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:shadow active:scale-95"
                    >
                      Khám phá ngay
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                    {(courseTab === "studying" ? studyingCourses : completedCourses).map((c) => (
                      <div 
                        key={c.courseId} 
                        className="p-4 rounded-2xl border border-slate-100/80 bg-slate-50/50 hover:bg-white hover:border-blue-100 hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <span className="text-[10px] bg-white border border-slate-200/60 px-2 py-0.5 rounded font-bold text-slate-500 uppercase tracking-wide">
                              {c.category}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide ${
                              c.level === "Beginner" 
                                ? "bg-green-50 text-green-600" 
                                : c.level === "Intermediate" 
                                ? "bg-amber-50 text-amber-600" 
                                : "bg-red-50 text-red-650"
                            }`}>
                              {c.level}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 mb-3">
                            {c.title}
                          </h3>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-slate-500 font-semibold mb-1.5">
                            <span>Tiến trình</span>
                            <span>{Math.round(c.progressPercentage)}%</span>
                          </div>
                          <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden mb-4">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500" 
                              style={{ width: `${c.progressPercentage}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-slate-400 font-bold">
                              Đã học: {c.completedLessons}/{c.totalLessons} bài
                            </span>
                            <Link
                              href={`/course/${c.courseId}`}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
                            >
                              {c.isCompleted ? "Xem lại" : "Học tiếp"}
                              <ChevronRight size={12} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Achievements & Badges Panel */}
            {user.role === "Student" && (
              <div className="bg-white rounded-3xl p-6 border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <div className="border-b border-slate-100 pb-5 mb-6">
                  <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
                    <Award className="text-purple-500" size={20} />
                    Huy hiệu danh dự
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Nhận huy hiệu vinh danh khi hoàn thành các mục tiêu học tập xuất sắc</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {badges.map((b) => (
                    <div 
                      key={b.id} 
                      className={`p-4 rounded-2xl border text-center relative overflow-hidden transition-all duration-300 ${
                        b.unlocked 
                          ? "bg-gradient-to-b from-white to-slate-50/20 border-slate-150 hover:shadow-md hover:scale-[1.02]" 
                          : "bg-slate-50/40 border-slate-100 opacity-50"
                      }`}
                    >
                      {/* Locked Overlay Icon */}
                      {!b.unlocked && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-slate-200/50 rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                          <Clock size={10} />
                        </div>
                      )}

                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner ${
                        b.unlocked ? b.color : "bg-slate-200 text-slate-400 grayscale"
                      }`}>
                        {b.icon}
                      </div>

                      <h3 className="font-bold text-xs text-slate-800 mb-1">{b.title}</h3>
                      <p className="text-[10px] text-slate-400 font-semibold leading-normal">{b.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Profile Info Panel (25%) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Profile Info Card */}
            <div className="bg-white rounded-3xl border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600" />
              
              <div className="px-5 pb-5 relative">
                <div className="flex justify-between items-end -mt-8 mb-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl border-4 border-white shadow-sm flex items-center justify-center text-white text-2xl font-black select-none">
                    {initials}
                  </div>
                  
                  {/* Status Badge */}
                  {user.role === "Student" && (
                    <span className={`text-[10px] border px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      activePlan === "PRO" 
                        ? "bg-purple-50 text-purple-600 border-purple-150" 
                        : activePlan === "PLUS"
                          ? "bg-blue-50 text-blue-600 border-blue-150"
                          : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                    }`}>
                      {activePlan === "PRO" ? "PRO Account" : activePlan === "PLUS" ? "PLUS Account" : "Học viên Free"}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-slate-850 text-base leading-tight truncate">{user.fullName}</h3>
                  <span className="text-[11px] text-slate-400 font-semibold block truncate">{user.email}</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                  <span className="text-xs bg-slate-50 text-slate-700 font-bold px-2.5 py-1 rounded-lg border border-slate-200 max-w-fit">
                    {roleLabel[user.role] ?? user.role}
                  </span>
                </div>

                {/* Plan expiration */}
                {user.role === "Student" && activePlan !== "FREE" && proExpiration && (
                  <div className={`mt-3 border rounded-xl p-3 ${
                    activePlan === "PRO" 
                      ? "bg-purple-50/70 border-purple-100" 
                      : "bg-blue-50/70 border-blue-100"
                  }`}>
                    <span className={`text-[10px] font-bold block mb-1 ${
                      activePlan === "PRO" ? "text-purple-500" : "text-blue-500"
                    }`}>
                      Thời gian gói {activePlan}
                    </span>
                    <span className={`text-xs text-purple-700 font-extrabold flex items-center gap-1 ${
                      activePlan === "PRO" ? "text-purple-700" : "text-blue-750"
                    }`}>
                      <Clock size={12} className="stroke-[2.5]" />
                      {getRemainingTimeStr(proExpiration)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Widget */}
            {user.role === "Student" && (
              <div className="bg-white rounded-3xl border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-5 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 w-16 h-16 bg-blue-50 rounded-full blur-xl pointer-events-none" />
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Số dư tài khoản</span>
                    <span className="text-xl font-black text-slate-850 mt-1 block">
                      {loadingBalance ? "..." : `${(balance ?? 0).toLocaleString("vi-VN")} VND`}
                    </span>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <Wallet size={18} className="stroke-[1.5]" />
                  </div>
                </div>
                
                <Link
                  href="/deposit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  Nạp thêm tiền
                </Link>
              </div>
            )}

            {/* Student Verification Status Widget */}
            {user.role === "Student" && (
              <div className="bg-white rounded-3xl border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-5">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-3">Xác minh Sinh viên</span>

                {user.studentVerificationStatus === "APPROVED" ? (
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex gap-2.5">
                    <ShieldCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-emerald-800">Đã xác minh</h4>
                      <p className="text-[10px] text-emerald-600 font-semibold leading-relaxed mt-0.5">
                        Tài khoản của bạn nhận được 30% ưu đãi tất cả các gói PRO.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`border rounded-2xl p-3 flex gap-2.5 ${
                      user.studentVerificationStatus === "PENDING"
                        ? "bg-amber-50/70 border-amber-100"
                        : user.studentVerificationStatus === "REJECTED"
                        ? "bg-red-50/70 border-red-100"
                        : "bg-slate-50/70 border-slate-100"
                    }`}>
                      <Shield size={16} className={`shrink-0 mt-0.5 ${
                        user.studentVerificationStatus === "PENDING"
                          ? "text-amber-500 animate-pulse"
                          : user.studentVerificationStatus === "REJECTED"
                          ? "text-red-500"
                          : "text-slate-400"
                      }`} />
                      <div>
                        <h4 className={`text-xs font-extrabold ${
                          user.studentVerificationStatus === "PENDING"
                            ? "text-amber-800"
                            : user.studentVerificationStatus === "REJECTED"
                            ? "text-red-800"
                            : "text-slate-700"
                        }`}>
                          {user.studentVerificationStatus === "PENDING" && "Đang chờ duyệt"}
                          {user.studentVerificationStatus === "REJECTED" && "Đã bị từ chối"}
                          {(!user.studentVerificationStatus || user.studentVerificationStatus === "NONE") && "Chưa xác minh"}
                        </h4>
                        <p className="text-[10px] text-slate-450 mt-1 leading-normal font-medium">
                          {user.studentVerificationStatus === "PENDING" && "Yêu cầu của bạn đang được kiểm duyệt (tối đa 24h)."}
                          {user.studentVerificationStatus === "REJECTED" && "Vui lòng gửi lại ảnh bằng chứng thẻ hợp lệ khác."}
                          {(!user.studentVerificationStatus || user.studentVerificationStatus === "NONE") && "Xác minh thẻ để nhận ưu đãi giảm 30% các gói PRO."}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsVerificationModalOpen(true)}
                      className={`w-full py-2 border rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
                        user.studentVerificationStatus === "PENDING"
                          ? "border-amber-200 text-amber-650 hover:bg-amber-50/50"
                          : user.studentVerificationStatus === "REJECTED"
                          ? "border-red-200 text-red-650 hover:bg-red-50/50"
                          : "border-blue-200 text-blue-650 hover:bg-blue-50/50"
                      }`}
                    >
                      {user.studentVerificationStatus === "PENDING" && "Kiểm tra / Nộp lại"}
                      {user.studentVerificationStatus === "REJECTED" && "Nộp lại bằng chứng"}
                      {(!user.studentVerificationStatus || user.studentVerificationStatus === "NONE") && "Xác minh ngay"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-3xl border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-4 flex flex-col gap-2">
              <Link 
                href="/pricing"
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Zap size={13} fill="currentColor" />
                Nâng cấp Gói PRO
              </Link>
              
              <button
                onClick={handleLogout}
                className="w-full py-2 border border-red-100 hover:bg-red-50 text-red-500 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <LogOut size={13} />
                Đăng xuất tài khoản
              </button>
            </div>

          </div>

        </div>

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
                      <span className="text-[10px] text-slate-450 mt-1">Hỗ trợ JPG, PNG, WEBP</span>
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
                    <p className="text-[11px] text-amber-750 mt-1 leading-normal">
                      Bằng chứng học sinh, sinh viên của bạn đang được duyệt. Quá trình này có thể mất tới 24h.
                    </p>
                    {user.studentCardPath && (
                      <a
                         href={apiUrl + (user.studentCardPath.startsWith("/") ? "" : "/") + user.studentCardPath}
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
                    <p className="text-xs text-emerald-850 font-semibold leading-relaxed">
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
                  <p className="text-[11px] text-red-750 mt-1 leading-normal">
                    Yêu cầu xác minh của bạn đã bị từ chối. Vui lòng nộp lại hình ảnh bằng chứng hợp lệ khác.
                  </p>
                  <button
                    onClick={() => setReSubmitMode(true)}
                    className="mt-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors active:scale-95"
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