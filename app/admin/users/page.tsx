"use client";
import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/useAuth";
import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminNavbar from "@/components/layout/AdminNavbar";
import { Loader2, Lock, Unlock, ChevronDown } from "lucide-react";

interface UserItem {
  id: number;
  fullName: string;
  email: string;
  role: string;
  isVerified: boolean;
  isLocked: boolean;
  createdAt: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483";
const ROLES = ["Student", "Instructor", "Manager", "Admin"];

export default function AdminUsers() {
  useRequireRole("Admin");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("ol_access_token") : null;

  const fetchUsers = () => {
    setLoading(true);
    fetch(`${BASE_URL}/api/admin/users?search=${search}&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => setUsers(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [search]);

  const changeRole = async (id: number, role: string) => {
    await fetch(`${BASE_URL}/api/admin/users/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role }),
    });
    fetchUsers();
  };

  const toggleLock = async (id: number) => {
    await fetch(`${BASE_URL}/api/admin/users/${id}/lock`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsers();
  };

  return (
    <div className="flex min-h-screen bg-[#eef2fb]">
      <AdminSidebar />
      <div className="flex-1 ml-[72px]">
        <AdminNavbar title="Quản lý Users" />
        <main className="pt-20 px-6 pb-10">
          {/* Search */}
          <div className="mb-5">
            <input
              className="input-field max-w-sm"
              placeholder="Tìm kiếm theo tên, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={28} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Người dùng", "Email", "Role", "Trạng thái", "Ngày tạo", "Hành động"].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
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
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u.id, e.target.value)}
                            className="appearance-none bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg pr-7 cursor-pointer border-0 outline-none"
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          u.isLocked
                            ? "bg-red-50 text-red-500"
                            : "bg-green-50 text-green-600"
                        }`}>
                          {u.isLocked ? "Đã khóa" : "Hoạt động"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleLock(u.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            u.isLocked
                              ? "bg-green-50 text-green-500 hover:bg-green-100"
                              : "bg-red-50 text-red-400 hover:bg-red-100"
                          }`}
                          title={u.isLocked ? "Mở khóa" : "Khóa tài khoản"}
                        >
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