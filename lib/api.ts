import {
  ApiResponse, AuthResponse, LoginRequest, CreateUserRequest, User,
  Course, CoursesQuery, PaginatedCourses, Lesson, CreateLessonRequest,
  Enrollment, UpdateProgressRequest, LessonProgress, CreateProgressRequest,
  RegisterRequest,
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

// ─── Core fetch ──────────────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? err?.message ?? `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const json = await res.json();
  // BE returns { success, data, pagination?, message?, errors? }
  // If has data + pagination, wrap into { items, ...pagination }
  if ("data" in json && Array.isArray(json.data) && "pagination" in json) {
    return { items: json.data, ...json.pagination } as T;
  }
  // If has data without pagination, unwrap
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

  getLessons: (courseId: number) =>
    request<Lesson[]>(`/courses/${courseId}/lessons`),
};

// ─── Lessons ─────────────────────────────────────────────────────────────────
export const lessonsApi = {
  getAll: () =>
    request<Lesson[]>("/lessons"),

  getById: (id: number) =>
    request<Lesson>(`/lessons/${id}`),

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

  delete: (id: number) =>
    request<void>(`/progress/${id}`, { method: "DELETE" }),
};