import {
  ApiResponse, AuthResponse, LoginRequest, CreateUserRequest, User,
  Course, CoursesQuery, PaginatedCourses, Lesson, CreateLessonRequest,
  Enrollment, EnrollmentDetail, UpdateProgressRequest, LessonProgress, CreateProgressRequest,
  RegisterRequest, Transaction, RevenueStats, CreatePaymentLinkRequest, CreateProPaymentLinkRequest,
  CreateDepositLinkRequest, CourseProgress, UserCourse, LessonWithProgress,
  BugReport, CreateBugReportRequest, UpdateBugReportStatusRequest
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

// Helper to translate field-specific validation messages to Vietnamese
function translateErrorMessage(msg: string, field: string): string {
  const fieldMap: Record<string, string> = {
    password: "Mật khẩu",
    email: "Email",
    fullname: "Họ và tên",
    confirmpassword: "Xác nhận mật khẩu",
    title: "Tiêu đề",
    description: "Mô tả",
    category: "Danh mục",
    price: "Giá",
    role: "Vai trò",
    content: "Nội dung",
    durationminutes: "Thời lượng",
  };

  const cleanField = fieldMap[field.toLowerCase()] || field;

  if (msg.includes("minimum length of")) {
    const match = msg.match(/minimum length of '(\d+)'/);
    const minLen = match ? match[1] : "6";
    return `${cleanField} phải có độ dài tối thiểu là ${minLen} ký tự.`;
  }

  if (msg.includes("field is required") || msg.includes("is required")) {
    return `${cleanField} không được để trống.`;
  }

  if (msg.includes("is not a valid e-mail address")) {
    return `Địa chỉ ${cleanField} không hợp lệ.`;
  }

  if (msg.includes("must be between")) {
    const match = msg.match(/between ([\d.,]+) and ([\d.,]+)/);
    if (match) {
      return `${cleanField} phải nằm trong khoảng từ ${match[1]} đến ${match[2]}.`;
    }
  }

  let translatedMsg = msg;
  if (field && msg.toLowerCase().includes(field.toLowerCase())) {
    const regex = new RegExp(field, "gi");
    translatedMsg = translatedMsg.replace(regex, cleanField);
  }

  return translatedMsg;
}

// Helper to translate generic backend error strings to Vietnamese
function translateGenericError(msg: string): string {
  const translations: Record<string, string> = {
    "email already exists": "Email này đã được sử dụng.",
    "invalid credentials": "Email hoặc mật khẩu không chính xác.",
    "invalid credentials.": "Email hoặc mật khẩu không chính xác.",
    "invalid username or password": "Email hoặc mật khẩu không chính xác.",
    "email or password is incorrect.": "Email hoặc mật khẩu không chính xác.",
    "email or password is incorrect": "Email hoặc mật khẩu không chính xác.",
    "user not found": "Không tìm thấy người dùng.",
    "course not found": "Không tìm thấy khóa học.",
    "lesson not found": "Không tìm thấy bài học.",
    "unauthorized": "Vui lòng đăng nhập để tiếp tục.",
    "forbidden": "Bạn không có quyền thực hiện hành động này.",
    "failed to refresh token": "Phiên làm việc hết hạn, vui lòng đăng nhập lại.",
    "refresh failed": "Phiên làm việc hết hạn, vui lòng đăng nhập lại.",
    "network request failed": "Không thể kết nối đến máy chủ, vui lòng kiểm tra mạng.",
    "internal server error": "Có lỗi hệ thống xảy ra, vui lòng thử lại sau.",
  };

  const key = msg.toLowerCase().trim();
  return translations[key] || msg;
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
    throw new Error(`Cannot reach API ${url}: ${translateGenericError(message)}`);
  }

  // ✅ Nếu 401 và còn lần retry và không phải là route login/auth -> thử refresh token rồi gọi lại
  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
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

    // 1. If it has a list of error strings or key-value validation dictionary (like ASP.NET Core)
    if (err?.errors) {
      if (Array.isArray(err.errors)) {
        if (err.errors.length > 0) {
          throw new Error(err.errors.map((e: any) => translateGenericError(String(e))).join("\n"));
        }
      } else if (typeof err.errors === "object") {
        const messages = Object.entries(err.errors)
          .map(([field, msgs]) => {
            const list = Array.isArray(msgs)
              ? msgs.map((m: any) => translateErrorMessage(String(m), field)).join(", ")
              : translateErrorMessage(String(msgs), field);
            return list;
          })
          .filter(Boolean);
        if (messages.length > 0) {
          throw new Error(messages.join("\n"));
        }
      }
    }

    // 2. If it's a flat dictionary of errors (e.g. BadRequest(ModelState))
    const keys = Object.keys(err).filter(k => k !== "status" && k !== "title" && k !== "traceId" && k !== "type");
    if (keys.length > 0 && keys.every(k => Array.isArray(err[k]) || typeof err[k] === "string")) {
      const messages = Object.entries(err)
        .map(([field, msgs]) => {
          const list = Array.isArray(msgs)
            ? msgs.map((m: any) => translateErrorMessage(String(m), field)).join(", ")
            : translateErrorMessage(String(msgs), field);
          return list;
        })
        .filter(Boolean);
      if (messages.length > 0) {
        throw new Error(messages.join("\n"));
      }
    }

    const errMsg = err?.detail ?? err?.message ?? err?.title ?? `HTTP ${res.status}`;
    throw new Error(translateGenericError(errMsg));
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

  getAll: (params?: { page?: number; pageSize?: number; userId?: number; courseId?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params?.userId) qs.set("userId", String(params.userId));
    if (params?.courseId) qs.set("courseId", String(params.courseId));
    return request<{ data: EnrollmentDetail[]; pagination: { totalCount: number; page: number; pageSize: number; totalPages: number } }>("/enrollments?" + qs.toString());
  },
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

// ─── Bug Reports ─────────────────────────────────────────────────────────────
export const bugReportsApi = {
  create: (body: CreateBugReportRequest) =>
    request<BugReport>("/bug-reports", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getMy: () =>
    request<BugReport[]>("/bug-reports/my"),

  getByCourse: (courseId: number) =>
    request<BugReport[]>("/bug-reports/course/" + courseId),

  getAll: (params?: { page?: number; pageSize?: number; courseId?: number; status?: string; category?: string; searchTerm?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params?.courseId) qs.set("courseId", String(params.courseId));
    if (params?.status) qs.set("status", params.status);
    if (params?.category) qs.set("category", params.category);
    if (params?.searchTerm) qs.set("searchTerm", params.searchTerm);
    return request<{ data: BugReport[]; pagination: { totalCount: number; page: number; pageSize: number; totalPages: number } }>("/bug-reports?" + qs.toString());
  },

  updateStatus: (id: number, body: UpdateBugReportStatusRequest) =>
    request<BugReport>(`/bug-reports/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (id: number) =>
    request<boolean>(`/bug-reports/${id}`, { method: "DELETE" }),

  uploadAttachment: (formData: FormData) =>
    request<{ attachmentUrl: string; message: string }>("/bug-reports/upload-attachment", {
      method: "POST",
      body: formData,
    }),
};