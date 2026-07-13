"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRequireRole } from "@/lib/useAuth";
import { coursesApi, bugReportsApi, usersApi, paymentApi, enrollmentsApi } from "@/lib/api";
import { apiFetch } from "@/lib/apiFetch";
import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminNavbar from "@/components/layout/AdminNavbar";
import { 
  Users, BookOpen, TrendingUp, DollarSign, Loader2, Bug, 
  AlertTriangle, CheckCircle2, Clock, Trash2, ShieldAlert,
  Search, RefreshCw, BarChart2, Layers, Filter, Check, Eye
} from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from "recharts";
import { BugReport, BugReportStatus, Transaction, RevenueStats, Course, EnrollmentDetail } from "@/lib/types";

interface UserItem {
  id: number;
  fullName: string;
  email: string;
  role: string;
  isVerified: boolean;
  isLocked: boolean;
  createdAt: string;
}

const ROLES = ["Student", "Instructor", "Manager", "Admin"];

export default function AdminDashboard() {
  const roleChecked = useRequireRole("Admin");
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "revenue" | "bugs">("overview");

  // Core data states
  const [users, setUsers] = useState<UserItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentDetail[]>([]);
  
  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  // Filter states
  const [userSearch, setUserSearch] = useState("");
  const [bugStatusFilter, setBugStatusFilter] = useState<string>("All");
  const [bugCategoryFilter, setBugCategoryFilter] = useState<string>("All");
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>("All");
  const [overviewCategoryFilter, setOverviewCategoryFilter] = useState<string>("All");
  const [enrollmentCategoryFilter, setEnrollmentCategoryFilter] = useState<"All" | "Frontend" | "Backend" | "Database">("All");
  const [enrollmentMonth, setEnrollmentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Course Category Map
  const [courseCategoryMap, setCourseCategoryMap] = useState<Record<number, string>>({});

  // Trigger alert messages
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  // Fetch all dashboard data
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // 1. Fetch Users
      const usersData = await apiFetch<UserItem[] | { items?: UserItem[] }>("/api/admin/users?pageSize=200");
      const usersList = Array.isArray(usersData) ? usersData : usersData.items ?? [];
      setUsers(usersList);

      // 2. Fetch Courses
      const coursesRes = await coursesApi.getAll({ pageSize: 100 });
      const coursesList = coursesRes.items || [];
      setCourses(coursesList);

      // Create Category Mapping
      const catMap: Record<number, string> = {};
      coursesList.forEach(c => {
        catMap[c.id] = c.category || "System";
      });
      setCourseCategoryMap(catMap);

      // 3. Fetch Revenue Stats
      const statsData = await paymentApi.getStats();
      setStats(statsData);

      // 4. Fetch Bug Reports
      const bugsRes = await bugReportsApi.getAll({ pageSize: 100 });
      const bugsList = (bugsRes as any).items || (bugsRes as any).data || [];
      setBugs(bugsList);

      // 5. Fetch Enrollments
      const enrollmentsRes = await enrollmentsApi.getAll({ pageSize: 9999 });
      const enrollList = (enrollmentsRes as any).items || (enrollmentsRes as any).data || [];
      setEnrollments(enrollList);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể tải dữ liệu quản trị.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roleChecked) {
      setMounted(true);
      fetchData();
    }
  }, [roleChecked]);

  // User Actions
  const handleUserRoleChange = async (userId: number, nextRole: string) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      triggerSuccess("Đã cập nhật vai trò người dùng.");
      fetchData();
    } catch (err: any) {
      setErrorMsg("Thay đổi vai trò thất bại.");
    }
  };

  const handleUserToggleLock = async (userId: number) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/lock`, { method: "PATCH" });
      triggerSuccess("Đã thay đổi trạng thái khóa của tài khoản.");
      fetchData();
    } catch (err: any) {
      setErrorMsg("Thao tác khóa/mở khóa thất bại.");
    }
  };

  // Bug Actions
  const handleUpdateBugStatus = async (bugId: number, nextStatus: BugReportStatus) => {
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return;

    const note = prompt("Nhập ghi chú phản hồi của Admin:", bug.adminNote || "");
    if (note === null) return;

    try {
      await bugReportsApi.updateStatus(bugId, {
        status: nextStatus,
        adminNote: note.trim() || undefined
      });
      triggerSuccess("Đã cập nhật trạng thái lỗi.");
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Cập nhật trạng thái lỗi thất bại.");
    }
  };

  const handleDeleteBug = async (bugId: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa báo cáo lỗi này khỏi hệ thống?")) return;
    try {
      await bugReportsApi.delete(bugId);
      triggerSuccess("Báo cáo lỗi đã được xóa.");
      fetchData();
    } catch (err: any) {
      setErrorMsg("Không thể xóa báo cáo lỗi.");
    }
  };

  // FILTERED LISTS
  // 1. Filtered Users
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const s = userSearch.toLowerCase();
    return users.filter(u => 
      u.fullName.toLowerCase().includes(s) || 
      u.email.toLowerCase().includes(s) ||
      u.role.toLowerCase().includes(s)
    );
  }, [users, userSearch]);

  // 2. Filtered Transactions
  const filteredTransactions = useMemo(() => {
    const txs = stats?.transactions || [];
    if (txCategoryFilter === "All") return txs;
    return txs.filter(tx => {
      const cat = courseCategoryMap[tx.courseId] || "System";
      return cat.toLowerCase() === txCategoryFilter.toLowerCase();
    });
  }, [stats?.transactions, txCategoryFilter, courseCategoryMap]);

  // 3. Filtered Bugs
  const filteredBugs = useMemo(() => {
    return bugs.filter(bug => {
      const matchStatus = bugStatusFilter === "All" || bug.status === bugStatusFilter;
      const bugCat = courseCategoryMap[bug.courseId] || "Other";
      const matchCategory = bugCategoryFilter === "All" || bugCat.toLowerCase() === bugCategoryFilter.toLowerCase();
      return matchStatus && matchCategory;
    });
  }, [bugs, bugStatusFilter, bugCategoryFilter, courseCategoryMap]);

  // CATEGORY STATISTICS (SUMS)
  const categoryRevenueStats = useMemo(() => {
    const successTxs = (stats?.transactions || []).filter(tx => tx.status === "SUCCESS");
    let feSum = 0;
    let beSum = 0;
    let dbSum = 0;
    let systemSum = 0;

    successTxs.forEach(tx => {
      const cat = courseCategoryMap[tx.courseId] || "System";
      if (cat.toLowerCase() === "frontend") feSum += tx.amount;
      else if (cat.toLowerCase() === "backend") beSum += tx.amount;
      else if (cat.toLowerCase() === "database") dbSum += tx.amount;
      else systemSum += tx.amount;
    });

    return {
      Frontend: feSum,
      Backend: beSum,
      Database: dbSum,
      System: systemSum
    };
  }, [stats?.transactions, courseCategoryMap]);

  // CATEGORY STUDY PROGRESS STATISTICS
  const categoryEnrollmentStats = useMemo(() => {
    let feStarted = 0, feCompleted = 0;
    let beStarted = 0, beCompleted = 0;
    let dbStarted = 0, dbCompleted = 0;

    enrollments.forEach(e => {
      const cat = courseCategoryMap[e.courseId] || "";
      const isCompleted = e.completedAt !== null && e.completedAt !== undefined;
      
      if (cat.toLowerCase() === "frontend") {
        feStarted++;
        if (isCompleted) feCompleted++;
      } else if (cat.toLowerCase() === "backend") {
        beStarted++;
        if (isCompleted) beCompleted++;
      } else if (cat.toLowerCase() === "database") {
        dbStarted++;
        if (isCompleted) dbCompleted++;
      }
    });

    return {
      Frontend: { started: feStarted, completed: feCompleted },
      Backend: { started: beStarted, completed: beCompleted },
      Database: { started: dbStarted, completed: dbCompleted }
    };
  }, [enrollments, courseCategoryMap]);

  // RECHARTS CHART DATA (Revenue aggregated by date)
  const chartData = useMemo(() => {
    const successTxs = (stats?.transactions || []).filter(tx => tx.status === "SUCCESS");
    
    // Filter success transactions by category if category filter is active
    const filteredTxs = overviewCategoryFilter === "All"
      ? successTxs
      : successTxs.filter(tx => {
          const cat = courseCategoryMap[tx.courseId] || "System";
          return cat.toLowerCase() === overviewCategoryFilter.toLowerCase();
        });

    const dailyMap: Record<string, number> = {};
    filteredTxs.forEach(tx => {
      const dateStr = new Date(tx.paymentTime).toLocaleDateString("vi-VN", { month: "2-digit", day: "2-digit" });
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + tx.amount;
    });

    const sortedKeys = Object.keys(dailyMap).sort((a, b) => {
      const [aDay, aMonth] = a.split("/").map(Number);
      const [bDay, bMonth] = b.split("/").map(Number);
      return aMonth === bMonth ? aDay - bDay : aMonth - bMonth;
    });

    // Take last 10 days for graph
    return sortedKeys.slice(-10).map(key => ({
      date: key,
      "Doanh thu": dailyMap[key]
    }));
  }, [stats?.transactions, overviewCategoryFilter, courseCategoryMap]);

  // Group enrollments by category or by specific course titles depending on drilldown + month filter
  const courseEnrollmentChartData = useMemo(() => {
    // 1. Filter out system enrollments (only keep Frontend, Backend, Database)
    const validEnrollments = enrollments.filter(e => {
      const cat = courseCategoryMap[e.courseId];
      return cat && (cat.toLowerCase() === "frontend" || cat.toLowerCase() === "backend" || cat.toLowerCase() === "database");
    });

    // 2. Filter by selected month
    let targetEnrollments: typeof validEnrollments;
    let monthLabel = "tất cả thời gian";

    if (enrollmentMonth === "all") {
      targetEnrollments = validEnrollments;
    } else {
      const [yearStr, monthStr] = enrollmentMonth.split("-");
      const filterYear = parseInt(yearStr);
      const filterMonth = parseInt(monthStr) - 1; // 0-indexed
      targetEnrollments = validEnrollments.filter(e => {
        if (!e.enrolledAt) return false;
        const d = new Date(e.enrolledAt);
        return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
      });
      monthLabel = `tháng ${monthStr}/${yearStr}`;
    }

    // 3. Build data based on current filter level
    if (enrollmentCategoryFilter === "All") {
      let feCount = 0;
      let beCount = 0;
      let dbCount = 0;

      targetEnrollments.forEach(e => {
        const cat = courseCategoryMap[e.courseId]?.toLowerCase();
        if (cat === "frontend") feCount++;
        else if (cat === "backend") beCount++;
        else if (cat === "database") dbCount++;
      });

      return {
        monthLabel,
        level: "All" as const,
        data: [
          { name: "Frontend", "Học viên": feCount, category: "Frontend" },
          { name: "Backend", "Học viên": beCount, category: "Backend" },
          { name: "Database", "Học viên": dbCount, category: "Database" }
        ]
      };
    } else {
      const countMap: Record<string, number> = {};
      targetEnrollments.forEach(e => {
        const cat = courseCategoryMap[e.courseId];
        if (cat && cat.toLowerCase() === enrollmentCategoryFilter.toLowerCase()) {
          const title = e.courseTitle || "Khóa học";
          countMap[title] = (countMap[title] || 0) + 1;
        }
      });

      const chartList = Object.entries(countMap)
        .map(([name, count]) => ({ name, "Học viên": count }))
        .sort((a, b) => b["Học viên"] - a["Học viên"])
        .slice(0, 8);

      return {
        monthLabel,
        level: enrollmentCategoryFilter,
        data: chartList
      };
    }
  }, [enrollments, courseCategoryMap, enrollmentCategoryFilter, enrollmentMonth]);

  // Stats boxes summary
  const summaryStats = [
    { label: "Tổng Doanh Thu", value: (stats?.totalRevenue ?? 0).toLocaleString("vi-VN") + "đ", icon: DollarSign, color: "bg-blue-600" },
    { label: "Gói Đã Bán", value: stats?.coursesSold ?? 0, icon: TrendingUp, color: "bg-emerald-600" },
    { label: "Tổng Học Viên", value: users.filter(u => u.role === "Student").length, icon: Users, color: "bg-indigo-600" },
    { label: "Báo Cáo Lỗi Mới", value: bugs.filter(b => b.status === "Open" || b.status === "InProgress").length, icon: Bug, color: "bg-red-600" }
  ];

  // Registered students only, sorted by registration date (newest to oldest)
  const registeredStudents = useMemo(() => {
    return users
      .filter(u => u.role === "Student")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users]);

  if (!roleChecked) return null;

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-800">
      <AdminSidebar />
      <div className="flex-1 ml-[72px]">
        <AdminNavbar title="Hệ thống Quản trị" />

        <main className="pt-20 px-8 pb-12 max-w-7xl mx-auto">
          {/* Success / Error Messages */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl mb-6 text-xs font-semibold">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl mb-6 text-xs font-semibold">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB NAVIGATION */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-px mb-8 overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "overview"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <BarChart2 size={14} /> Tổng quan
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "users"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users size={14} /> Quản lý Users
            </button>
            <button
              onClick={() => setActiveTab("revenue")}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "revenue"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <DollarSign size={14} /> Doanh thu & Giao dịch
            </button>
            <button
              onClick={() => setActiveTab("bugs")}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "bugs"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Bug size={14} /> Báo cáo lỗi
            </button>
            <button onClick={fetchData} className="ml-auto p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all mb-2" title="Tải lại dữ liệu">
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-8 animate-[fadeIn_0.2s_ease-out]">
                  {/* Summary Stat Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    {summaryStats.map((s) => (
                      <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-150 flex items-center gap-4 shadow-sm relative overflow-hidden">
                        <div className={`${s.color} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
                          <s.icon size={18} className="text-white" />
                        </div>
                        <div>
                          <div className="text-xl font-black text-slate-900 leading-none">{s.value}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{s.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                   {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue Graph with Category Filters */}
                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <div>
                            <h3 className="font-black text-slate-900 text-sm">Biểu đồ Doanh thu</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">Doanh thu giao dịch thành công theo ngày.</p>
                          </div>
                          
                          {/* Filter by Category */}
                          <div className="flex items-center gap-1 overflow-x-auto py-1">
                            {["All", "Frontend", "Backend", "Database", "System"].map(cat => (
                              <button
                                key={cat}
                                onClick={() => setOverviewCategoryFilter(cat)}
                                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${
                                  overviewCategoryFilter === cat
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {cat === "All" ? "Tất cả" : cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Chart Container */}
                        <div className="h-64 w-full">
                          {mounted && chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#94a3b8" }} />
                                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "#94a3b8" }} />
                                <Tooltip 
                                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} 
                                />
                                <Line type="monotone" dataKey="Doanh thu" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-slate-400 italic">
                              Chưa có dữ liệu doanh thu phát sinh cho phân loại này.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Course Enrollments Graph */}
                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <div>
                            <h3 className="font-black text-slate-900 text-sm">
                              {enrollmentCategoryFilter === "All" ? "Lượt học theo Khóa học" : `Chi tiết lượt học: ${enrollmentCategoryFilter}`}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {enrollmentCategoryFilter === "All" 
                                ? `Tổng quan học viên bắt đầu học (${courseEnrollmentChartData.monthLabel}).` 
                                : `Chi tiết lượt học trong nhóm ${enrollmentCategoryFilter} (${courseEnrollmentChartData.monthLabel}).`}
                            </p>
                          </div>

                          {/* Category Filter Tabs + Month Picker */}
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1 overflow-x-auto">
                              {(["All", "Frontend", "Backend", "Database"] as const).map(cat => (
                                <button
                                  key={cat}
                                  onClick={() => setEnrollmentCategoryFilter(cat)}
                                  className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${
                                    enrollmentCategoryFilter === cat
                                      ? "bg-slate-900 text-white border-slate-900"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  {cat === "All" ? "Tất cả" : cat}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="month"
                                value={enrollmentMonth === "all" ? "" : enrollmentMonth}
                                onChange={(e) => setEnrollmentMonth(e.target.value || "all")}
                                className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold border border-slate-200 bg-white text-slate-600 outline-none focus:border-blue-400 transition-all"
                              />
                              <button
                                onClick={() => setEnrollmentMonth("all")}
                                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${
                                  enrollmentMonth === "all"
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                Tất cả
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Chart Container */}
                        <div className="h-64 w-full">
                          {mounted && courseEnrollmentChartData.data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={courseEnrollmentChartData.data}
                                  cx="50%"
                                  cy="48%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${(name || "").substring(0, 10)}${(name || "").length > 10 ? "..." : ""} (${((percent || 0) * 100).toFixed(0)}%)`}
                                  outerRadius={65}
                                  fill="#8b5cf6"
                                  dataKey="Học viên"
                                  className={enrollmentCategoryFilter === "All" ? "cursor-pointer" : ""}
                                  onClick={(state: any) => {
                                    if (enrollmentCategoryFilter === "All" && state && state.payload) {
                                      const clickedCat = state.payload.category;
                                      if (clickedCat) {
                                        setEnrollmentCategoryFilter(clickedCat);
                                      }
                                    }
                                  }}
                                >
                                  {courseEnrollmentChartData.data.map((entry, index) => {
                                    const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#a855f7", "#14b8a6"];
                                    return <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />;
                                  })}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-slate-400 italic">
                              Chưa có lượt đăng ký học khóa học nào.
                            </div>
                          )}
                        </div>

                        {/* Back navigation text for Drilldown */}
                        {enrollmentCategoryFilter !== "All" && (
                          <div className="mt-2 text-right">
                            <button 
                              onClick={() => setEnrollmentCategoryFilter("All")}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider"
                            >
                              ← Quay lại Tổng quan
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>


                  {/* Two columns: Category Revenue Stats & Recent Users */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category sums & statistics */}
                    <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-6">
                      <div>
                        <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-3.5 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                          <DollarSign size={13} className="text-slate-400" /> Doanh thu & Giao dịch
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng doanh thu</span>
                            <span className="text-sm font-black text-blue-600 mt-1 block">{(stats?.totalRevenue ?? 0).toLocaleString("vi-VN")}đ</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gói đã bán</span>
                            <span className="text-sm font-black text-slate-800 mt-1 block">{stats?.coursesSold ?? 0} lượt mua</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <span className="text-slate-400">Tổng học viên đang học</span>
                          <span className="font-black text-slate-800">{enrollments.length} lượt ghi danh</span>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-3.5 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                          <BookOpen size={13} className="text-slate-400" /> Thống kê học tập theo chuyên mục
                        </h3>
                        <div className="space-y-3.5">
                          {["Frontend", "Backend", "Database"].map(cat => {
                            const catStats = categoryEnrollmentStats[cat as "Frontend" | "Backend" | "Database"] || { started: 0, completed: 0 };
                            const total = catStats.started || 1;
                            const pct = Math.round((catStats.completed / total) * 100) || 0;
                            return (
                              <div key={cat} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                  <span className="flex items-center gap-1.5 font-bold">
                                    <span className={`w-2 h-2 rounded-full ${
                                      cat === "Frontend" ? "bg-blue-500" : cat === "Backend" ? "bg-indigo-500" : "bg-amber-500"
                                    }`} />
                                    {cat}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    <span className="text-slate-900 font-bold">{catStats.started}</span> học viên học • <span className="text-emerald-600 font-bold">{catStats.completed}</span> hoàn thành ({pct}%)
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      cat === "Frontend" ? "bg-blue-500" : cat === "Backend" ? "bg-indigo-500" : "bg-amber-500"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* New User signup widget */}
                    <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-4 flex items-center gap-1.5">
                        <Users size={13} className="text-slate-400" /> Học viên mới đăng ký
                      </h3>
                      <div className="divide-y divide-slate-50">
                        {registeredStudents.slice(0, 5).map(u => (
                          <div key={u.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-500">
                              {u.fullName.split(" ").pop()?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 text-xs truncate leading-tight">{u.fullName}</p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{u.email}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold shrink-0">
                              {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: USER MANAGEMENT */}
              {activeTab === "users" && (
                <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
                  {/* Search tool */}
                  <div className="flex items-center gap-3 max-w-sm bg-white border border-slate-200 px-3.5 py-2 rounded-xl focus-within:border-blue-500 transition-all">
                    <Search size={14} className="text-slate-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Tìm kiếm học viên theo tên, email, vai trò..."
                      className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
                    />
                  </div>

                  {/* Users Table */}
                  <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                            <th className="p-4">Học viên</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Vai trò hệ thống</th>
                            <th className="p-4">Trạng thái</th>
                            <th className="p-4">Ngày tham gia</th>
                            <th className="p-4 text-right">Khóa tài khoản</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-600">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400 italic">Không có người dùng nào khớp với tìm kiếm.</td>
                            </tr>
                          ) : (
                            filteredUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-500">
                                      {u.fullName.split(" ").pop()?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-slate-800">{u.fullName}</span>
                                  </div>
                                </td>
                                <td className="p-4 font-medium text-slate-500">{u.email}</td>
                                <td className="p-4">
                                  <select 
                                    value={u.role} 
                                    onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                                  >
                                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                                    u.isLocked
                                      ? "bg-red-50 text-red-600 border-red-200"
                                      : "bg-emerald-50 text-emerald-600 border-emerald-200"
                                  }`}>
                                    {u.isLocked ? "Đã khóa" : "Hoạt động"}
                                  </span>
                                </td>
                                <td className="p-4 text-slate-400">
                                  {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleUserToggleLock(u.id)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${
                                      u.isLocked
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                        : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                    }`}
                                  >
                                    {u.isLocked ? "Mở khóa" : "Khóa tài khoản"}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: REVENUE & TRANSACTIONS */}
              {activeTab === "revenue" && (
                <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
                  {/* Category Stats Overview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {["Frontend", "Backend", "Database"].map(cat => {
                      const catStats = categoryEnrollmentStats[cat as "Frontend" | "Backend" | "Database"] || { started: 0, completed: 0 };
                      return (
                        <div key={cat} className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm">
                          <span className={`text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1.5 ${
                            cat === "Frontend" ? "text-blue-500" : cat === "Backend" ? "text-indigo-500" : "text-amber-500"
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              cat === "Frontend" ? "bg-blue-500" : cat === "Backend" ? "bg-indigo-500" : "bg-amber-500"
                            }`} />
                            {cat}
                          </span>
                          <span className="text-lg font-black text-slate-900 mt-1 block">
                            {catStats.started} <span className="text-xs font-bold text-slate-400">học viên</span>
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">
                            ✓ {catStats.completed} hoàn thành
                          </span>
                        </div>
                      );
                    })}
                    <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tổng doanh thu Gói PRO / Nạp tiền
                      </span>
                      <span className="text-lg font-black text-blue-600 mt-1 block">
                        {(stats?.totalRevenue ?? 0).toLocaleString("vi-VN")}đ
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold mt-0.5 block">
                        {stats?.coursesSold ?? 0} lượt mua
                      </span>
                    </div>
                  </div>

                  {/* Table Toolbar / Lọc chuyên mục */}
                  <div className="flex items-center gap-4 justify-between flex-wrap">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Lịch sử giao dịch toàn hệ thống
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mr-1">Chuyên mục:</span>
                      {["All", "Frontend", "Backend", "Database", "System"].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setTxCategoryFilter(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            txCategoryFilter === cat
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {cat === "All" ? "Tất cả" : cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                            <th className="p-4">Mã đơn</th>
                            <th className="p-4">Học viên</th>
                            <th className="p-4">Khóa học / Dịch vụ</th>
                            <th className="p-4">Chuyên mục</th>
                            <th className="p-4">Số tiền</th>
                            <th className="p-4">Thời gian</th>
                            <th className="p-4 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-600">
                          {filteredTransactions.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 italic">Chưa phát sinh giao dịch nào.</td>
                            </tr>
                          ) : (
                            filteredTransactions.map((tx) => {
                              const cat = courseCategoryMap[tx.courseId] || "System";
                              return (
                                <tr key={tx.transactionId} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 font-mono font-bold text-[10px] text-slate-400">{tx.orderCode}</td>
                                  <td className="p-4 font-semibold text-slate-800">{tx.userFullName ?? "Học viên"}</td>
                                  <td className="p-4 font-medium text-slate-700">{tx.courseTitle ?? "Khóa học"}</td>
                                  <td className="p-4">
                                    <span className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-slate-500">
                                      {cat}
                                    </span>
                                  </td>
                                  <td className="p-4 font-bold text-blue-600">{(tx.amount).toLocaleString("vi-VN")}đ</td>
                                  <td className="p-4 text-slate-400">
                                    {new Date(tx.paymentTime).toLocaleString("vi-VN")}
                                  </td>
                                  <td className="p-4 text-center">
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
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: BUG REPORTS */}
              {activeTab === "bugs" && (
                <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
                  {/* Toolbar & filters */}
                  <div className="flex items-center gap-4 justify-between flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mr-1">Trạng thái:</span>
                      {["All", "Open", "InProgress", "Resolved", "Closed"].map(st => (
                        <button
                          key={st}
                          onClick={() => setBugStatusFilter(st)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            bugStatusFilter === st
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {st === "All" ? "Tất cả" : st}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mr-1">Chuyên mục:</span>
                      {["All", "Frontend", "Backend", "Database", "System"].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setBugCategoryFilter(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            bugCategoryFilter === cat
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {cat === "All" ? "Tất cả" : cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bugs Table */}
                  <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                            <th className="p-4">Người gửi</th>
                            <th className="p-4">Khóa học / Bài học</th>
                            <th className="p-4">Chi tiết lỗi báo cáo</th>
                            <th className="p-4">Trạng thái</th>
                            <th className="p-4">Ghi chú xử lý</th>
                            <th className="p-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-600">
                          {filteredBugs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400 italic">Không tìm thấy báo cáo lỗi nào.</td>
                            </tr>
                          ) : (
                            filteredBugs.map((bug) => (
                              <tr key={bug.id} className="hover:bg-slate-50/50 transition-colors align-top">
                                <td className="p-4">
                                  <p className="font-semibold text-slate-800">{bug.userFullName}</p>
                                  <p className="text-[10px] text-slate-400">{bug.userEmail}</p>
                                </td>
                                <td className="p-4">
                                  <p className="font-semibold text-slate-700 truncate max-w-[150px]">{bug.courseTitle}</p>
                                  <p className="text-[10px] text-slate-450 truncate max-w-[150px]">{bug.lessonTitle || "Toàn khóa"}</p>
                                </td>
                                <td className="p-4 max-w-xs">
                                  <p className="font-bold text-slate-800 leading-snug">{bug.title}</p>
                                  <p className="text-[10px] text-slate-500 mt-1 whitespace-pre-line leading-relaxed">{bug.description}</p>
                                  <p className="text-[9px] text-slate-400 mt-2">
                                    Gửi ngày: {new Date(bug.createdAt).toLocaleDateString("vi-VN")} {new Date(bug.createdAt).toLocaleTimeString("vi-VN", {hour: '2-digit', minute:'2-digit'})}
                                  </p>
                                  {bug.attachmentUrl && (
                                    <div className="mt-1.5">
                                      <a
                                        href={bug.attachmentUrl.startsWith("http") ? bug.attachmentUrl : `${process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483"}${bug.attachmentUrl}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 text-blue-600 rounded text-[9px] font-bold hover:bg-blue-50 transition-colors"
                                      >
                                        🖼️ Xem ảnh đính kèm
                                      </a>
                                    </div>
                                  )}
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 max-w-fit ${
                                    bug.status === "Open"
                                      ? "bg-red-50 text-red-600 border-red-200"
                                      : bug.status === "InProgress"
                                      ? "bg-amber-50 text-amber-600 border-amber-200"
                                      : bug.status === "Resolved"
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                      : "bg-slate-50 text-slate-500 border-slate-200"
                                  }`}>
                                    {bug.status === "Open" && <AlertTriangle size={10} />}
                                    {bug.status === "InProgress" && <Clock size={10} />}
                                    {bug.status === "Resolved" && <CheckCircle2 size={10} />}
                                    {bug.status}
                                  </span>
                                </td>
                                <td className="p-4 max-w-xs">
                                  {bug.instructorNote && (
                                    <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg text-[10px] text-slate-600 mb-1">
                                      <p className="font-bold text-slate-400">Ghi chú Instructor:</p>
                                      <p className="whitespace-pre-line mt-0.5">{bug.instructorNote}</p>
                                    </div>
                                  )}
                                  {bug.adminNote ? (
                                    <div className="bg-blue-50/50 border border-blue-100 p-2 rounded-lg text-[10px] text-blue-700">
                                      <p className="font-bold text-blue-400">Ghi chú Admin:</p>
                                      <p className="whitespace-pre-line mt-0.5">{bug.adminNote}</p>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">Chưa ghi chú</span>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex flex-col gap-1 items-end">
                                    <button
                                      onClick={() => handleUpdateBugStatus(bug.id, "InProgress")}
                                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded text-[10px] font-bold transition-all"
                                    >
                                      Đang xử lý
                                    </button>
                                    <button
                                      onClick={() => handleUpdateBugStatus(bug.id, "Resolved")}
                                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded text-[10px] font-bold transition-all"
                                    >
                                      Giải quyết
                                    </button>
                                    <button
                                      onClick={() => handleUpdateBugStatus(bug.id, "Closed")}
                                      className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-bold transition-all"
                                    >
                                      Đóng lỗi
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBug(bug.id)}
                                      className="p-1 rounded bg-slate-50 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-slate-100 transition-all mt-1"
                                      title="Xóa báo cáo"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}