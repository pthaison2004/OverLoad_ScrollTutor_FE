"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, saveUser, setToken, setRefreshToken } from "@/lib/auth";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483") + "/api";

// Thử dùng refreshToken để lấy accessToken mới
async function tryRestoreSession(): Promise<boolean> {
  const refreshToken = localStorage.getItem("ol_refresh_token");
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;

    const json = await res.json();
    const data = json.data ?? json;
    if (!data.accessToken) return false;

    // Lưu lại session mới
    setToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    if (data.user) saveUser(data.user);

    return true;
  } catch {
    return false;
  }
}

export function useRequireRole(role: "Admin" | "Manager" | "Instructor") {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const accessToken = localStorage.getItem("ol_access_token");
      const refreshToken = localStorage.getItem("ol_refresh_token");

      // Không có cả 2 token → chưa đăng nhập
      if (!accessToken && !refreshToken) {
        router.replace("/login");
        return;
      }

      // Không có accessToken nhưng có refreshToken → thử restore session
      if (!accessToken && refreshToken) {
        const restored = await tryRestoreSession();
        if (!restored) {
          router.replace("/login");
          return;
        }
      }

      // Lấy user (có thể vừa được cập nhật bởi tryRestoreSession)
      const user = getUser();
      if (!user) {
        // Có token nhưng không có user info → thử restore
        const restored = await tryRestoreSession();
        if (!restored) {
          router.replace("/login");
          return;
        }
        const refreshedUser = getUser();
        if (!refreshedUser) {
          router.replace("/login");
          return;
        }
      }

      const currentUser = getUser();
      if (currentUser?.role?.toLowerCase() !== role.toLowerCase()) {
        console.warn(`[useRequireRole] role mismatch: got "${currentUser?.role}", need "${role}"`);
        router.replace("/home?error=unauthorized");
        return;
      }

      setChecked(true);
    }

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return checked;
}