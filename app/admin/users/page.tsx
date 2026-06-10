"use client";
import { useEffect, useState, useCallback } from "react";
import { useRequireRole } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";
import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminNavbar from "@/components/layout/AdminNavbar";
import { Loader2, Lock, Unlock, ChevronDown, WifiOff } from "lucide-react";

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

export default function AdminUsers() {
  const roleChecked = useRequireRole("Admin");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch<UserItem[]>(`/api/admin/users?search=${search}&pageSize=50`)
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    if (roleChecked) fetchUsers();
  }, [search, roleChecked, fetchUsers]);

  const changeRole = async (id: number, role: string) => {
    await apiFetch(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }).catch(console.error);
    fetchUsers();
  };

  const toggleLock = async (id: number) => {
    await apiFetch(`/api/admin/users/${id}/lock`, { method: "PATCH" }).catch(console.error);
    fetchUsers();
  };

  if (!roleChecked) return null;

  return (
    <div className="flex min-h-screen bg-[#eef2fb]">
      <AdminSidebar />
      <div className="flex-1 ml-[72px]">
        <AdminNavbar title="Quản lý Users" />
        <main className="pt-20 px-6 pb-10">
          <div className="mb-5">
            <input
              className="input-field max-w-sm"
              placeholder="Tìm kiếm theo tên, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={28} className="animate-spin text-blue-500" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <WifiOff size={32} />
                <p className="text-sm font-medium">Không thể tải dữ liệu</p>
                <p className="text-xs max-w-sm text-center">{error}</p>
                <button onClick={fetchUsers}
                  className="mt-2 px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Thử lại
                </button>
              </div>
            ) : users.length === 0 ? (
              <div className="flex justify-center py-16 text-slate-400 text-sm">Không có người dùng nào</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Người dùng", "Email", "Role", "Trạng thái", "Ngày tạo", "Hành động"].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                            {u.fullName.split(" ").pop()?.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-700">{u.fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{u.email}</td>
                      <td className="px-5 py-4">
                        <div className="relative inline-block">
                          <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                            className="appearance-none bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg pr-7 cursor-pointer border-0 outline-none">
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.isLocked ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"}`}>
                          {u.isLocked ? "Đã khóa" : "Hoạt động"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => toggleLock(u.id)}
                          className={`p-2 rounded-lg transition-colors ${u.isLocked ? "bg-green-50 text-green-500 hover:bg-green-100" : "bg-red-50 text-red-400 hover:bg-red-100"}`}
                          title={u.isLocked ? "Mở khóa" : "Khóa tài khoản"}>
                          {u.isLocked ? <Unlock size={15} /> : <Lock size={15} />}
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