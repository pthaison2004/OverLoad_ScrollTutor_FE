"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { coursesApi, bugReportsApi } from "@/lib/api";
import { Course, BugReport, BugReportStatus } from "@/lib/types";
import { 
  Plus, Edit, Trash2, BookOpen, AlertCircle, RefreshCw, Layers, Sparkles, 
  Bug, CheckCircle2, Clock, AlertTriangle, MessageSquare, Send
} from "lucide-react";

import { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function InstructorDashboardContent() {
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category")?.toLowerCase() || "";

  // States
  const [courses, setCourses] = useState<Course[]>([]);
  const filteredCourses = useMemo(() => {
    if (!activeCategory) return courses;
    return courses.filter((c: Course) => c.category?.toLowerCase() === activeCategory);
  }, [courses, activeCategory]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Bug Reports states
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loadingBugs, setLoadingBugs] = useState(true);
  const [updatingBugId, setUpdatingBugId] = useState<number | null>(null);

  // Modals state
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [currentCourseEdit, setCurrentCourseEdit] = useState<Course | null>(null); // null means CREATE new
  const [courseFormData, setCourseFormData] = useState<{
    title: string;
    description: string;
    thumbnailUrl: string;
    category: string;
    price: number;
    level: "Beginner" | "Intermediate" | "Advanced";
    isPublished: boolean;
  }>({
    title: "",
    description: "",
    thumbnailUrl: "",
    category: "Frontend",
    price: 0,
    level: "Beginner",
    isPublished: true
  });

  // Fetch all bug reports for instructor's courses
  const fetchAllBugReports = async (instructorCourses: Course[]) => {
    setLoadingBugs(true);
    try {
      const promises = instructorCourses.map(c => bugReportsApi.getByCourse(c.id));
      const results = await Promise.all(promises);
      const allBugs = results.flat();
      allBugs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBugReports(allBugs);
    } catch (err) {
      console.error("Lỗi khi tải danh sách báo cáo lỗi:", err);
    } finally {
      setLoadingBugs(false);
    }
  };

  // Fetch all courses
  const fetchCourses = async () => {
    setLoadingCourses(true);
    setErrorMsg("");
    try {
      const res = await coursesApi.getAll({ pageSize: 100 });
      const allCourses = (res.items || []).filter((c: Course) => c.category?.toLowerCase() !== "system");
      setCourses(allCourses);
      await fetchAllBugReports(allCourses);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể tải danh sách khóa học.");
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Calculate count of Open bugs per course
  const openBugsCountPerCourse = useMemo(() => {
    const counts: Record<number, number> = {};
    bugReports.forEach(bug => {
      if (bug.status === "Open" || bug.status === "InProgress") {
        counts[bug.courseId] = (counts[bug.courseId] || 0) + 1;
      }
    });
    return counts;
  }, [bugReports]);

  // Set message helper
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Course CRUD Submit
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormData.title.trim()) return;

    setErrorMsg("");
    try {
      if (currentCourseEdit) {
        await coursesApi.update(currentCourseEdit.id, courseFormData);
        triggerSuccess(`Đã cập nhật khóa học "${courseFormData.title}"`);
      } else {
        await coursesApi.create(courseFormData);
        triggerSuccess(`Đã tạo khóa học mới "${courseFormData.title}"`);
      }
      setCourseModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi lưu thông tin khóa học.");
    }
  };

  // Delete Course
  const handleDeleteCourse = async (id: number, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa khóa học "${title}" cùng tất cả các bài học bên trong không?`)) return;
    setErrorMsg("");
    try {
      await coursesApi.delete(id);
      triggerSuccess(`Đã xóa khóa học "${title}"`);
      fetchCourses();
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể xóa khóa học.");
    }
  };

  // Update bug status
  const handleUpdateBugStatus = async (bugId: number, currentStatus: string, nextStatus: BugReportStatus, defaultNote = "") => {
    const note = prompt(
      `Nhập ghi chú hoặc phản hồi xử lý lỗi (tùy chọn):`,
      defaultNote || bugReports.find(b => b.id === bugId)?.instructorNote || ""
    );
    if (note === null) return; // Cancelled

    setUpdatingBugId(bugId);
    setErrorMsg("");
    try {
      await bugReportsApi.updateStatus(bugId, {
        status: nextStatus,
        instructorNote: note.trim() || undefined
      });
      triggerSuccess("Đã cập nhật trạng thái báo cáo lỗi.");
      // Refresh bugs
      fetchAllBugReports(courses);
    } catch (err: any) {
      setErrorMsg(err.message || "Cập nhật trạng thái lỗi thất bại.");
    } finally {
      setUpdatingBugId(null);
    }
  };

  // Report to admin
  const handleReportToAdmin = async (bugId: number) => {
    const bug = bugReports.find(b => b.id === bugId);
    if (!bug) return;

    const note = prompt(
      "Ghi chú gửi Admin giải quyết cùng (mô tả lý do cần Admin hỗ trợ):",
      "Cần admin kiểm tra lại lỗi hệ thống."
    );
    if (note === null) return;

    setUpdatingBugId(bugId);
    setErrorMsg("");
    try {
      // Set to InProgress and add note specifying Admin support needed
      await bugReportsApi.updateStatus(bugId, {
        status: "InProgress",
        instructorNote: `[Yêu cầu hỗ trợ từ Admin]: ${note.trim()}`
      });
      triggerSuccess("Đã chuyển tiếp thông tin báo cáo lên Admin.");
      fetchAllBugReports(courses);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể chuyển tiếp báo cáo lỗi.");
    } finally {
      setUpdatingBugId(null);
    }
  };

  // Open Course Modal
  const openCourseModal = (course?: Course) => {
    if (course) {
      setCurrentCourseEdit(course);
      setCourseFormData({
        title: course.title,
        description: course.description || "",
        thumbnailUrl: course.thumbnailUrl || "",
        category: course.category || "Frontend",
        price: course.price || 0,
        level: (course.level as any) || "Beginner",
        isPublished: course.isPublished
      });
    } else {
      setCurrentCourseEdit(null);
      setCourseFormData({
        title: "",
        description: "",
        thumbnailUrl: "",
        category: "Frontend",
        price: 0,
        level: "Beginner",
        isPublished: true
      });
    }
    setCourseModalOpen(true);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            Dashboard
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Quản lý các khóa học lập trình trực quan và xem báo cáo lỗi bài học từ học viên.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link
            href="/instructor/student-verifications"
            className="flex items-center gap-1 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
          >
            Duyệt sinh viên
          </Link>
          <button
            onClick={() => openCourseModal()}
            className="flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_16px_rgba(37,99,235,0.2)]"
          >
            <Plus size={14} /> Thêm khóa học
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl mb-6 text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl mb-6 text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Courses List Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Layers size={13} className="text-slate-400" /> Các khóa học của bạn ({filteredCourses.length})
          </h2>
          <button onClick={fetchCourses} className="text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>

        {loadingCourses ? (
          <div className="py-12 text-center text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">
            Đang tải khóa học...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs bg-white shadow-sm flex flex-col items-center justify-center gap-2">
            <BookOpen size={20} className="text-slate-300" />
            <p className="font-bold text-slate-700">Chưa có khóa học nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCourses.map((course) => {
              // Dynamic level badges
              let levelBadgeClass = "bg-blue-50 text-blue-600 border border-blue-150";
              if (course.level === "Beginner") {
                levelBadgeClass = "bg-emerald-50 text-emerald-600 border border-emerald-150";
              } else if (course.level === "Advanced") {
                levelBadgeClass = "bg-rose-50 text-rose-600 border border-rose-150";
              }

              const openBugs = openBugsCountPerCourse[course.id] || 0;

              return (
                <div
                  key={course.id}
                  onClick={() => router.push(`/instructor/courses/${course.id}/lessons`)}
                  className="bg-white border border-slate-100 rounded-2xl p-4 hover:border-blue-300 hover:shadow-[0_4px_20px_rgba(37,99,235,0.02)] transition-all duration-200 cursor-pointer flex items-center gap-4 group relative"
                >
                  {/* Open bugs badge */}
                  {openBugs > 0 && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Bug size={8} /> {openBugs} lỗi
                    </span>
                  )}

                  {/* Small icon/thumbnail on the left */}
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600 shrink-0 border border-slate-100 overflow-hidden">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as any).src = "https://placehold.co/100/e2e8f0/64748b?text=Course";
                        }}
                      />
                    ) : (
                      <BookOpen size={18} className="stroke-[1.5]" />
                    )}
                  </div>

                  {/* Info in the middle */}
                  <div className="flex-1 min-w-0 pr-8">
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate text-sm">
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[8px] bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                        {course.category}
                      </span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${levelBadgeClass}`}>
                        {course.level}
                      </span>
                      <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-150 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                        {course.price > 0 ? `${course.price.toLocaleString("vi-VN")}đ` : "Free"}
                      </span>
                      {!course.isPublished && (
                        <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-150 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                          Nháp
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      {course.description || "Không có mô tả chi tiết."}
                    </p>
                  </div>

                  {/* Action buttons on the right */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openCourseModal(course)}
                      className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 transition-all active:scale-90"
                      title="Chỉnh sửa khóa học"
                    >
                      <Edit size={11} />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-slate-100 transition-all active:scale-90"
                      title="Xóa khóa học"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bug Reports Section */}
      <div className="flex flex-col gap-4 mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Bug size={13} className="text-slate-400 animate-pulse" /> Báo cáo lỗi từ học viên ({bugReports.length})
          </h2>
          <button onClick={() => fetchAllBugReports(courses)} className="text-slate-400 hover:text-slate-655 transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          {loadingBugs ? (
            <div className="py-12 text-center text-xs text-slate-400 font-semibold uppercase tracking-widest animate-pulse">
              Đang tải danh sách báo cáo lỗi...
            </div>
          ) : bugReports.length === 0 ? (
            <div className="p-8 text-center text-slate-455 text-xs flex flex-col items-center justify-center gap-2 bg-white">
              <p className="font-bold text-slate-700">Chưa có báo cáo lỗi nào</p>
              <p className="text-[10px] text-slate-400">Học viên chưa phát hiện lỗi nào trên các bài học của bạn.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                    <th className="p-4">Học viên</th>
                    <th className="p-4">Khóa học / Bài học</th>
                    <th className="p-4">Chi tiết lỗi</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4">Ghi chú phản hồi</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {bugReports.map((bug) => {
                    const isUpdating = updatingBugId === bug.id;
                    return (
                      <tr key={bug.id} className="hover:bg-slate-50/50 transition-colors align-top">
                        <td className="p-4">
                          <p className="font-semibold text-slate-800">{bug.userFullName}</p>
                          <p className="text-[10px] text-slate-400">{bug.userEmail}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-700 truncate max-w-[160px]">{bug.courseTitle}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{bug.lessonTitle || "Toàn khóa học"}</p>
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="font-bold text-slate-800">{bug.title}</p>
                          <p className="text-[10px] text-slate-500 mt-1 whitespace-pre-line">{bug.description}</p>
                          <p className="text-[9px] text-slate-400 mt-1.5">
                            Ngày báo: {new Date(bug.createdAt).toLocaleDateString("vi-VN")}
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
                              : "bg-slate-50 text-slate-550 border-slate-200"
                          }`}>
                            {bug.status === "Open" && <AlertTriangle size={10} />}
                            {bug.status === "InProgress" && <Clock size={10} />}
                            {bug.status === "Resolved" && <CheckCircle2 size={10} />}
                            {bug.status}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs">
                          {bug.instructorNote ? (
                            <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg text-[10px] text-slate-600 whitespace-pre-line">
                              <p className="font-bold text-slate-400 mb-0.5">Ghi chú của bạn:</p>
                              {bug.instructorNote}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Chưa phản hồi</span>
                          )}
                          {bug.adminNote && (
                            <div className="bg-red-50/50 border border-red-100 p-2 rounded-lg text-[10px] text-red-650 mt-1 whitespace-pre-line">
                              <p className="font-bold text-red-400 mb-0.5">Phản hồi của Admin:</p>
                              {bug.adminNote}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col gap-1 items-end justify-start">
                            {bug.status !== "Resolved" && bug.status !== "Closed" && (
                              <>
                                <button
                                  onClick={() => handleUpdateBugStatus(bug.id, bug.status, "InProgress")}
                                  disabled={isUpdating}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded text-[10px] font-bold transition-all flex items-center gap-1"
                                >
                                  {isUpdating ? "..." : "Đang xử lý"}
                                </button>
                                <button
                                  onClick={() => handleUpdateBugStatus(bug.id, bug.status, "Resolved")}
                                  disabled={isUpdating}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded text-[10px] font-bold transition-all flex items-center gap-1"
                                >
                                  {isUpdating ? "..." : "Giải quyết"}
                                </button>
                                <button
                                  onClick={() => handleReportToAdmin(bug.id)}
                                  disabled={isUpdating}
                                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-bold transition-all flex items-center gap-1"
                                  title="Gửi báo cáo hỗ trợ lên admin"
                                >
                                  {isUpdating ? "..." : "Báo Admin 👑"}
                                </button>
                              </>
                            )}
                            {(bug.status === "Resolved" || bug.status === "Closed") && (
                              <button
                                onClick={() => handleUpdateBugStatus(bug.id, bug.status, bug.status)}
                                disabled={isUpdating}
                                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded text-[10px] transition-all"
                              >
                                {isUpdating ? "..." : "Sửa phản hồi"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Course Modal */}
      {courseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-[scaleUp_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {currentCourseEdit ? "Chỉnh sửa khóa học" : "Tạo khóa học mới"}
            </h3>
            
            <form onSubmit={handleCourseSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Tên khóa học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: HTML/CSS Cơ bản"
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={courseFormData.title}
                  onChange={(e) => setCourseFormData({...courseFormData, title: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Mô tả ngắn</label>
                <textarea
                  placeholder="Giới thiệu sơ qua về nội dung khóa học..."
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all h-24 resize-none"
                  value={courseFormData.description}
                  onChange={(e) => setCourseFormData({...courseFormData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Danh mục</label>
                  <select
                    className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    value={courseFormData.category}
                    onChange={(e) => setCourseFormData({...courseFormData, category: e.target.value})}
                  >
                    <option value="Backend">Backend</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Database">Database</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Trình độ</label>
                  <select
                    className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    value={courseFormData.level}
                    onChange={(e) => setCourseFormData({...courseFormData, level: e.target.value as "Beginner" | "Intermediate" | "Advanced"})}
                  >
                    <option value="Beginner">Free</option>
                    <option value="Intermediate">Plus</option>
                    <option value="Advanced">Pro</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Ảnh Thumbnail (URL)</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={courseFormData.thumbnailUrl}
                  onChange={(e) => setCourseFormData({...courseFormData, thumbnailUrl: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="isPublished"
                  className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500"
                  checked={courseFormData.isPublished}
                  onChange={(e) => setCourseFormData({...courseFormData, isPublished: e.target.checked})}
                />
                <label htmlFor="isPublished" className="text-xs font-semibold text-slate-600 cursor-pointer">
                  Công khai khóa học (Cho phép học viên thấy)
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setCourseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function InstructorDashboard() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
        Đang tải trang quản trị...
      </div>
    }>
      <InstructorDashboardContent />
    </Suspense>
  );
}
