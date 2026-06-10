"use client";
import { useEffect, useState, useCallback } from "react";
import { useRequireRole } from "@/lib/useAuth";
import ManagerSidebar from "@/components/layout/ManagerSidebar";
import ManagerNavbar from "@/components/layout/ManagerNavbar";
import { Trash2, Loader2 } from "lucide-react";

interface Enrollment {
  id: number;
  userId: number;
  courseId: number;
  userFullName: string;
  courseTitle: string;
  progressPercentage: number;
  enrolledAt: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483";
const getToken = () => localStorage.getItem("ol_access_token");

export default function ManagerEnrollments() {
  // ✅ Guard quyền
  const roleChecked = useRequireRole("Manager");

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnrollments = useCallback(() => {
    setLoading(true);
    fetch(`${BASE_URL}/api/manager/enrollments`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((res) => setEnrollments(res.data?.items ?? res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // ✅ Chỉ fetch khi đã xác nhận quyền
    if (roleChecked) fetchEnrollments();
  }, [roleChecked, fetchEnrollments]);

  const deleteEnrollment = async (id: number) => {
    if (!confirm("Xóa enrollment này?")) return;
    await fetch(`${BASE_URL}/api/manager/enrollments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    fetchEnrollments();
  };

  // ✅ Không render nếu chưa xác nhận quyền
  if (!roleChecked) return null;

  return (
    <div className="flex min-h-screen bg-[#eef2fb]">
      <ManagerSidebar />
      <div className="flex-1 ml-[72px]">
        <ManagerNavbar title="Quản lý Enrollments" />
        <main className="pt-20 px-6 pb-10">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={28} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Học viên", "Khóa học", "Tiến độ", "Ngày đăng ký", "Hành động"].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-slate-700">{e.userFullName}</td>
                      <td className="px-5 py-4 text-slate-500">{e.courseTitle}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${e.progressPercentage}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{e.progressPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {new Date(e.enrolledAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => deleteEnrollment(e.id)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}