// ===== BE Response wrapper =====
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// ===== Auth =====
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

// ===== User =====
export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  role: "Student" | "Instructor" | "Admin";
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  role: "Student";
}

// ===== Course =====
export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailUrl?: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  isPublished: boolean;
  slug?: string;
  totalDurationMinutes?: number;
  totalLessons?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoursesQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  level?: string;
  isPublished?: boolean;
  sortBy?: string;
  sortDesc?: boolean;
}

export interface PaginatedCourses {
  items: Course[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ===== Lesson =====
export interface Lesson {
  id: number;
  courseId: number;
  title: string;
  description: string;
  content: string; // Nội dung text/bài học
  template?: string; // Code template cho editor
  language?: "javascript" | "html" | "css";
  durationMinutes: number;
  isFree: boolean;
}

export interface CreateLessonRequest {
  courseId: number;
  title: string;
  description: string;
  content: string; // Nội dung text/bài học
  template?: string; // Code template cho editor
  language?: "javascript" | "html" | "css";
  durationMinutes: number;
  isFree: boolean;
}

// ===== Enrollment =====
export interface Enrollment {
  id: number;
  userId: number;
  courseId: number;
  progressPercentage?: number;
  completedAt?: string;
  lastAccessedAt?: string;
}

export interface EnrollmentDetail {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  enrolledAt: string;
  completedAt?: string | null;
  progressPercentage?: number;
  lastAccessedAt?: string;
}

export interface UpdateProgressRequest {
  progressPercentage: number;
  completedAt?: string;
  lastAccessedAt?: string;
}

// ===== Progress =====
export interface LessonProgress {
  id: number;
  userId: number;
  lessonId: number;
  lastScrollPercentage: number;
  unlockedCheckpointIndex: number;
  completed: boolean;
  lastPositionSeconds: number;
  watchTimeSeconds: number;
}

export interface CreateProgressRequest {
  userId: number;
  lessonId: number;
  lastScrollPercentage?: number;
  unlockedCheckpointIndex?: number;
  completed?: boolean;
  lastPositionSeconds?: number;
  watchTimeSeconds?: number;
}

// ===== UI helpers (FE-only, not from BE) =====
// Map BE level → UI display
export const LEVEL_MAP: Record<string, { label: string; badge: "free" | "plus" | "pro" }> = {
  Beginner: { label: "Miễn phí", badge: "free" },
  Intermediate: { label: "Plus", badge: "plus" },
  Advanced: { label: "Pro", badge: "pro" },
};

// Fallback colors per category for course cards
export const CATEGORY_COLORS: Record<string, string> = {
  "HTML": "from-orange-500 to-red-500",
  "CSS": "from-orange-500 to-red-500",
  "JavaScript": "from-yellow-400 to-orange-400",
  "ReactJS": "from-cyan-400 to-blue-500",
  "NodeJS": "from-green-500 to-emerald-600",
  "Sass": "from-pink-500 to-rose-600",
  "Programming": "from-blue-600 to-blue-800",
  "default": "from-blue-500 to-indigo-600",
};

export function getCourseColor(course: Course): string {
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (course.title.includes(key) || course.category.includes(key)) {
      return CATEGORY_COLORS[key];
    }
  }
  return CATEGORY_COLORS["default"];
}
