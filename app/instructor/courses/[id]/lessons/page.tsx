"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { coursesApi, lessonsApi } from "@/lib/api";
import { Course, Lesson, CreateLessonRequest } from "@/lib/types";
import {
  Plus, Edit, Trash2, ArrowLeft, AlertCircle, RefreshCw,
  BookOpen, Clock, GripVertical, Eye, Code, Loader2, ChevronDown, ChevronUp
} from "lucide-react";

export default function InstructorLessonsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    content: string;
    durationMinutes: number;
    isFree: boolean;
  }>({
    title: "",
    description: "",
    content: "",
    durationMinutes: 10,
    isFree: false,
  });
  const [saving, setSaving] = useState(false);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [c, res] = await Promise.all([
        coursesApi.getById(courseId),
        lessonsApi.getByCourse(courseId),
      ]);
      setCourse(c);
      setLessons(res.items || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) fetchData();
  }, [courseId]);

  // Open modal
  const openModal = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setFormData({
        title: lesson.title,
        description: lesson.description || "",
        content: lesson.content || "",
        durationMinutes: lesson.durationMinutes || 10,
        isFree: lesson.isFree,
      });
    } else {
      setEditingLesson(null);
      setFormData({
        title: "",
        description: "",
        content: "",
        durationMinutes: 10,
        isFree: false,
      });
    }
    setModalOpen(true);
  };

  // Submit lesson
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setSaving(true);
    setErrorMsg("");
    try {
      if (editingLesson) {
        await lessonsApi.update(editingLesson.id, {
          ...formData,
          courseId,
        });
        triggerSuccess(`Đã cập nhật bài học "${formData.title}"`);
        setModalOpen(false);
        fetchData();
      } else {
        const newL = await lessonsApi.create({
          ...formData,
          courseId,
        });
        triggerSuccess(`Đã tạo bài học mới "${formData.title}"`);
        router.push(`/instructor/courses/${courseId}/lessons/${newL.id}/edit`);
        return;
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi lưu bài học.");
    } finally {
      setSaving(false);
    }
  };

  // Delete lesson
  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài học "${title}"?`)) return;
    setErrorMsg("");
    try {
      await lessonsApi.delete(id);
      triggerSuccess(`Đã xóa bài học "${title}"`);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể xóa bài học.");
    }
  };

  // Count <pre> blocks in content
  const countSteps = (content: string): number => {
    const matches = content.match(/<pre[\s>]/gi);
    return matches ? matches.length : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto text-slate-800 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/instructor/dashboard"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors mb-2 font-semibold"
          >
            <ArrowLeft size={12} /> Quay lại Dashboard
          </Link>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600" />
            {course?.title || "Khóa học"}
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Quản lý các bài học và nội dung scrollytelling trong khóa học này.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/course/${courseId}`)}
            className="flex items-center gap-1 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
          >
            <Eye size={13} /> Xem trước
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-[0_4px_16px_rgba(37,99,235,0.2)]"
          >
            <Plus size={14} /> Thêm bài học
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

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 block">{lessons.length}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bài học</span>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Code size={18} />
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 block">
              {lessons.reduce((sum, l) => sum + countSteps(l.content || ""), 0)}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code Steps</span>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 block">
              {lessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0)} phút
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng thời lượng</span>
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <GripVertical size={13} className="text-slate-400" /> Danh sách bài học
          </h2>
          <button onClick={fetchData} className="text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>

        {lessons.length === 0 ? (
          <div className="p-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs bg-white shadow-sm flex flex-col items-center justify-center gap-3">
            <BookOpen size={28} className="text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">Chưa có bài học nào</p>
            <p className="text-slate-400">Bấm "Thêm bài học" để bắt đầu thiết kế nội dung.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lessons.map((lesson, index) => {
              const steps = countSteps(lesson.content || "");

              return (
                <div 
                  key={lesson.id} 
                  onClick={() => router.push(`/instructor/courses/${courseId}/lessons/${lesson.id}/edit`)}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer"
                >
                  {/* Lesson Row */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Order badge */}
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-black text-slate-400 shrink-0">
                      {lesson.orderIndex || index + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{lesson.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[8px] bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                          <Clock size={8} /> {lesson.durationMinutes} phút
                        </span>
                        {steps > 0 && (
                          <span className="text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-150 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                            <Code size={8} /> {steps} steps
                          </span>
                        )}
                        {lesson.isFree && (
                          <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-150 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                            Miễn phí
                          </span>
                        )}
                      </div>
                      {lesson.description && (
                        <p className="text-[10px] text-slate-400 mt-1 truncate">{lesson.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/instructor/courses/${courseId}/lessons/${lesson.id}/edit`)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100 transition-all text-[10px] font-bold active:scale-95 whitespace-nowrap"
                        title="Thiết kế chi tiết bài học"
                      >
                        <Code size={11} />
                        Thiết kế Steps
                      </button>
                      <button
                        onClick={() => openModal(lesson)}
                        className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 transition-all active:scale-90"
                        title="Sửa thông tin bài học"
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        onClick={() => handleDelete(lesson.id, lesson.title)}
                        className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-red-655 hover:bg-red-50 border border-slate-100 transition-all active:scale-90"
                        title="Xóa bài học"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lesson Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 shadow-2xl animate-[scaleUp_0.2s_ease-out] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingLesson ? "Chỉnh sửa bài học" : "Tạo bài học mới"}
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Tiêu đề bài học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Introduction to HTML"
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Mô tả ngắn</label>
                <input
                  type="text"
                  placeholder="Mô tả ngắn gọn về bài học"
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>



              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Thời lượng (phút)</label>
                  <input
                    type="number"
                    min={1}
                    className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <input
                    type="checkbox"
                    id="isFree"
                    className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500"
                    checked={formData.isFree}
                    onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                  />
                  <label htmlFor="isFree" className="text-xs font-semibold text-slate-600 cursor-pointer">
                    Bài học miễn phí (cho xem trước)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  {editingLesson ? "Cập nhật" : "Tạo bài học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
