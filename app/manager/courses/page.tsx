"use client";
import { useEffect, useState, useCallback } from "react";
import { useRequireRole } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";
import ManagerSidebar from "@/components/layout/ManagerSidebar";
import ManagerNavbar from "@/components/layout/ManagerNavbar";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X } from "lucide-react";

interface Course {
  id: number;
  title: string;
  category: string;
  level: string;
  isPublished: boolean;
  slug: string;
}

function CourseModal({ course, onClose, onSave }: {
  course?: Course;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    title: course?.title ?? "",
    description: "",
    category: course?.category ?? "frontend",
    level: course?.level ?? "Beginner",
    slug: course?.slug ?? "",
    isPublished: course?.isPublished ?? false,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiFetch(
        course ? `/api/manager/courses/${course.id}` : "/api/manager/courses",
        { method: course ? "PUT" : "POST", body: JSON.stringify(form) }
      );
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800 text-lg">
            {course ? "Sửa khóa học" : "Thêm khóa học"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <input className="input-field" placeholder="Tên khóa học" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input-field" placeholder="Slug (vd: html-css-co-ban)" value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <textarea className="input-field resize-none" rows={3} placeholder="Mô tả"
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="input-field" value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
            <option value="database">Database</option>
          </select>
          <select className="input-field" value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-slate-600">Publish ngay</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {course ? "Lưu thay đổi" : "Tạo khóa học"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManagerCourses() {
  const roleChecked = useRequireRole("Manager");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; course?: Course }>({ open: false });

  const fetchCourses = useCallback(() => {
    setLoading(true);
    apiFetch<Course[]>("/api/manager/courses?pageSize=100")
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (roleChecked) fetchCourses();
  }, [roleChecked, fetchCourses]);

  const togglePublish = async (id: number) => {
    await apiFetch(`/api/manager/courses/${id}/publish`, { method: "PATCH" }).catch(console.error);
    fetchCourses();
  };

  const deleteCourse = async (id: number) => {
    if (!confirm("Xóa khóa học này?")) return;
    await apiFetch(`/api/manager/courses/${id}`, { method: "DELETE" }).catch(console.error);
    fetchCourses();
  };

  if (!roleChecked) return null;

  return (
    <div className="flex min-h-screen bg-[#eef2fb]">
      <ManagerSidebar />
      <div className="flex-1 ml-[72px]">
        <ManagerNavbar title="Quản lý Khóa học" />
        <main className="pt-20 px-6 pb-10">
          <div className="flex justify-between items-center mb-5">
            <span className="text-sm text-slate-500">{courses.length} khóa học</span>
            <button onClick={() => setModal({ open: true })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              <Plus size={16} /> Thêm khóa học
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={28} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Tên khóa học", "Category", "Level", "Trạng thái", "Hành động"].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-slate-700">{c.title}</td>
                      <td className="px-5 py-4 text-slate-500 capitalize">{c.category}</td>
                      <td className="px-5 py-4">
                        <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full font-medium">{c.level}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.isPublished ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"}`}>
                          {c.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => togglePublish(c.id)}
                            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
                            title={c.isPublished ? "Unpublish" : "Publish"}>
                            {c.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button onClick={() => setModal({ open: true, course: c })}
                            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => deleteCourse(c.id)}
                            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
      {modal.open && (
        <CourseModal course={modal.course} onClose={() => setModal({ open: false })} onSave={fetchCourses} />
      )}
    </div>
  );
}