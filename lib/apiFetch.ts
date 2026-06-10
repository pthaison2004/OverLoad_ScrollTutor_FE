// lib/apiFetch.ts
// Helper fetch dùng chung — tự gắn token, parse JSON an toàn
// Dùng thay cho fetch(...).then(r => r.json()) ở khắp nơi

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483";

export { BASE_URL };

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("ol_access_token")
    : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Đọc text trước, tránh crash khi body rỗng
  const text = await res.text();
  if (!text || !text.trim()) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return undefined as T;
  }

  const json = JSON.parse(text);
  if (!res.ok) {
    throw new Error(json?.message ?? json?.detail ?? `HTTP ${res.status}`);
  }

  // Unwrap data nếu BE trả { success, data }
  return (json?.data ?? json) as T;
}