import {
  ApiResponse, AuthResponse, LoginRequest, CreateUserRequest, User,
  Course, CoursesQuery, PaginatedCourses, Lesson, CreateLessonRequest,
  Enrollment, EnrollmentDetail, UpdateProgressRequest, LessonProgress, CreateProgressRequest,
  RegisterRequest, Transaction, RevenueStats, CreatePaymentLinkRequest, CreateProPaymentLinkRequest,
  CreateDepositLinkRequest, CourseProgress, UserCourse, LessonWithProgress
} from "./types";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483") + "/api";

// ─── Token helpers ───────────────────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ol_access_token");
}

export function setToken(token: string) {
  localStorage.setItem("ol_access_token", token);
}

export function removeToken() {
  localStorage.removeItem("ol_access_token");
}

// ─── Refresh token helper ────────────────────────────────────────────────────
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  // Nếu đang refresh thì chờ cái đang chạy, tránh gọi nhiều lần
  if (isRefreshing && refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem("ol_refresh_token");
  if (!refreshToken) return null;

  isRefreshing = true;
  refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })
    .then((r) => {
      if (!r.ok) throw new Error("Refresh failed");
      return r.json();
    })
    .then((json) => {
      const data = json.data ?? json;
      const newToken = data.accessToken;
      if (!newToken) throw new Error("No token in refresh response");

      // Lưu lại tokens và user mới
      localStorage.setItem("ol_access_token", newToken);
      if (data.refreshToken) localStorage.setItem("ol_refresh_token", data.refreshToken);
      if (data.user) localStorage.setItem("ol_user", JSON.stringify(data.user));

      return newToken as string;
    })
    .catch(() => {
      // Refresh thất bại → xóa hết, redirect login
      localStorage.removeItem("ol_access_token");
      localStorage.removeItem("ol_refresh_token");
      localStorage.removeItem("ol_user");
      window.location.replace("/login");
      return null;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

// ─── Core fetch (có auto-retry sau refresh) ──────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true   // thử refresh 1 lần nếu 401
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const url = `${BASE_URL}${path}`;
  let res: Response;

  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`Cannot reach API ${url}: ${message}`);
  }

  // ✅ Nếu 401 và còn lần retry → thử refresh token rồi gọi lại
  if (res.status === 401 && retry) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      // Gọi lại request với token mới, retry = false để tránh vòng lặp
      return request<T>(path, options, false);
    }
    // tryRefreshToken đã redirect rồi, throw để dừng
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? err?.message ?? `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const json = await res.json();
  if ("data" in json && Array.isArray(json.data) && "pagination" in json) {
    return { items: json.data, ...json.pagination } as T;
  }
  if ("data" in json) {
    return json.data as T;
  }
  return json as T;
}

function buildQuery(params: Record<string, unknown>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return q ? `?${q}` : "";
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (body: LoginRequest) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  register: (body: RegisterRequest) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  logout: () =>
    request<void>("/auth/logout", { method: "POST" }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};

// ─── Courses ─────────────────────────────────────────────────────────────────
export const coursesApi = {
  getAll: (query: CoursesQuery = {}) =>
    request<PaginatedCourses>(`/courses${buildQuery(query as Record<string, unknown>)}`),

  getById: (id: number) =>
    request<Course>(`/courses/${id}`),

  getBySlug: (slug: string) =>
    request<Course>(`/courses/slug/${slug}`),

  getByCategory: (category: string, query: CoursesQuery = {}) =>
    request<PaginatedCourses>(
      `/courses/category/${encodeURIComponent(category)}${buildQuery(query as Record<string, unknown>)}`
    ),

  getLessons: (courseId: number) =>
    request<LessonWithProgress[]>(`/courses/${courseId}/lessons`),

  getCourseProgress: (courseId: number) =>
    request<CourseProgress>(`/courses/${courseId}/progress`),

  create: (body: Partial<Course>) =>
    request<Course>("/courses", { method: "POST", body: JSON.stringify(body) }),

  update: (id: number, body: Partial<Course>) =>
    request<Course>(`/courses/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  delete: (id: number) =>
    request<void>(`/courses/${id}`, { method: "DELETE" }),
};

// ─── Lessons ─────────────────────────────────────────────────────────────────
export const lessonsApi = {
  getAll: () =>
    request<Lesson[]>("/lessons"),

  getById: (id: number) =>
    request<Lesson>(`/lessons/${id}`),

  getByCourse: (courseId: number) =>
    request<{ items: Lesson[] }>(`/lessons?courseId=${courseId}&pageSize=100`),

  create: (body: CreateLessonRequest) =>
    request<Lesson>("/lessons", { method: "POST", body: JSON.stringify(body) }),

  update: (id: number, body: Partial<CreateLessonRequest>) =>
    request<Lesson>(`/lessons/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  delete: (id: number) =>
    request<void>(`/lessons/${id}`, { method: "DELETE" }),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  getById: (id: number) =>
    request<User>(`/users/${id}`),

  update: (id: number, body: Partial<User>) =>
    request<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  uploadStudentCard: (formData: FormData) =>
    request<{ success: boolean; message: string; studentVerificationStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED"; studentCardPath: string }>("/users/me/student-verification", {
      method: "POST",
      body: formData,
    }),

  dismissRejection: () =>
    request<{ success: boolean; message: string }>("/users/me/dismiss-rejection", {
      method: "POST",
    }),

  getPendingStudentVerifications: () =>
    request<Array<{ id: number; fullName: string; email: string; avatarUrl?: string; studentCardPath: string; updatedAt: string }>>("/users/student-verifications/pending"),

  getApprovedStudentVerifications: () =>
    request<Array<{ id: number; fullName: string; email: string; avatarUrl?: string; studentCardPath: string; updatedAt: string }>>("/users/student-verifications/approved"),

  verifyStudent: (userId: number, action: "approve" | "reject") =>
    request<{ success: boolean; message: string; studentVerificationStatus: "APPROVED" | "REJECTED" }>("/users/student-verification/verify", {
      method: "POST",
      body: JSON.stringify({ userId, action }),
    }),

  getMyCoursesWithProgress: () =>
    request<UserCourse[]>("/users/me/courses"),
};

// ─── Enrollments ─────────────────────────────────────────────────────────────
export const enrollmentsApi = {
  enroll: (userId: number, courseId: number) =>
    request<Enrollment>("/enrollments", {
      method: "POST",
      body: JSON.stringify({ userId, courseId }),
    }),

  getByUser: (userId: number) =>
    request<Enrollment[]>(`/enrollments/user/${userId}`),

  getByUserDetails: (userId: number) =>
    request<EnrollmentDetail[]>(`/Enrollments/user/${userId}`),

  getByCourse: (courseId: number) =>
    request<Enrollment[]>(`/enrollments/course/${courseId}`),

  updateProgress: (enrollmentId: number, body: UpdateProgressRequest) =>
    request<Enrollment>(`/enrollments/${enrollmentId}/progress`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id: number) =>
    request<void>(`/enrollments/${id}`, { method: "DELETE" }),
};

// ─── Progress ────────────────────────────────────────────────────────────────
export const progressApi = {
  getUserLesson: (userId: number, lessonId: number) =>
    request<LessonProgress>(`/progress/user/${userId}/lesson/${lessonId}`),

  getByUser: (userId: number) =>
    request<LessonProgress[]>(`/progress/user/${userId}`),

  upsert: (body: CreateProgressRequest) =>
    request<LessonProgress>("/progress", { method: "POST", body: JSON.stringify(body) }),

  upsertV2: (body: CreateProgressRequest) =>
    request<LessonProgress>("/Progress/upsert", { method: "POST", body: JSON.stringify(body) }),

  delete: (id: number) =>
    request<void>(`/progress/${id}`, { method: "DELETE" }),
};

// ─── Payment ─────────────────────────────────────────────────────────────────
export const paymentApi = {
  createLink: (body: CreatePaymentLinkRequest) =>
    request<{ checkoutUrl: string }>("/payment/create-link", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createProLink: (body: CreateProPaymentLinkRequest) =>
    request<{ checkoutUrl: string }>("/payment/create-pro-link", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  buyProWithBalance: (body: CreateProPaymentLinkRequest) =>
    request<{ message: string }>("/payment/buy-pro-balance", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createDepositLink: (body: CreateDepositLinkRequest) =>
    request<{ checkoutUrl: string }>("/payment/create-deposit-link", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getBalance: () =>
    request<{ balance: number }>("/payment/balance"),

  getTransactions: () =>
    request<Transaction[]>("/payment/transactions"),

  getStats: () =>
    request<RevenueStats>("/payment/stats"),
};