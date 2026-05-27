"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft, X, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { setToken, setRefreshToken, saveUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", remember: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login({ email: form.email, password: form.password });
      setToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      saveUser(res.user);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col items-center mb-7">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mb-3 border border-slate-100">
            <svg viewBox="0 0 40 40" width="36" height="36">
              <path d="M20 4 L34 12 L34 28 L20 36 L6 28 L6 12 Z" fill="none" stroke="#2563EB" strokeWidth="3" />
              <path d="M14 16 Q20 10 26 16 Q20 22 14 16Z" fill="#2563EB" />
              <path d="M14 24 Q20 18 26 24 Q20 30 14 24Z" fill="#93c5fd" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800">Đăng nhập vào OverLoad</h1>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
            <input
              className="input-field"
              type="email"
              placeholder="Email của bạn"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <input
                className="input-field pr-10"
                type={showPw ? "text" : "password"}
                placeholder="Nhập mật khẩu"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded"
              checked={form.remember}
              onChange={(e) => setForm({ ...form, remember: e.target.checked })}
            />
            <span className="text-sm text-slate-500">Ghi nhớ đăng nhập</span>
          </label>

          <button type="submit" className="btn-primary mt-1 flex items-center justify-center gap-2" disabled={loading}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            Đăng nhập
          </button>
        </form>

        <div className="flex flex-col items-center mt-5 gap-2 text-sm text-slate-500">
          <p>
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-blue-600 font-semibold hover:underline">
              Đăng ký
            </Link>
          </p>
          <Link href="#" className="text-blue-600 hover:underline">Quên mật khẩu?</Link>
        </div>
      </div>
    </div>
  );
}
