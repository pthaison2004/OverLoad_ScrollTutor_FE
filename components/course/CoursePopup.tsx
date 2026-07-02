"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, BookOpen, Loader2 } from "lucide-react";
import { Course, getCourseColor, LEVEL_MAP } from "@/lib/types";
import { enrollmentsApi, paymentApi } from "@/lib/api";
import { getUser } from "@/lib/auth";

interface Props {
  course: Course;
  onClose: () => void;
}

export default function CoursePopup({ course, onClose }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const gradient = getCourseColor(course);
  const levelInfo = LEVEL_MAP[course.level] ?? { label: course.level, badge: "free" };

  const handleEnroll = async () => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (course.price > 0) {
        const fromPath = typeof window !== "undefined" ? window.location.pathname : "/";
        const res = await paymentApi.createLink({
          courseId: course.id,
          returnUrl: `${window.location.origin}/payment/success?from=${encodeURIComponent(fromPath)}`,
          cancelUrl: `${window.location.origin}/payment/cancel?from=${encodeURIComponent(fromPath)}`,
        });
        if (res && res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          throw new Error("Không thể tạo liên kết thanh toán.");
        }
      } else {
        await enrollmentsApi.enroll(user.id, course.id);
        router.push(`/course/${course.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("400") ||
        msg.includes("409") ||
        msg.toLowerCase().includes("already") ||
        msg.includes("đăng ký") ||
        msg.includes("đã mua")
      ) {
        router.push(`/course/${course.id}`);
      } else {
        setError(msg || "Có lỗi xảy ra, vui lòng thử lại.");
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`h-28 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <span className="text-white text-2xl font-bold">&lt;/&gt;</span>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">{course.title}</h2>
          <div className="flex justify-between items-center mb-3">
            <span className={`badge-${levelInfo.badge} inline-block`}>{levelInfo.label}</span>
            <span className="text-sm font-bold text-blue-600">
              {levelInfo.badge === "free" ? "Miễn phí" : ""}
            </span>
          </div>

          <p className="text-sm text-slate-500 mb-4 leading-relaxed line-clamp-3">
            {course.description}
          </p>

          <div className="flex items-center gap-1 text-xs text-slate-400 mb-5">
            <BookOpen size={13} />
            <span>{course.category}</span>
          </div>

          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                router.push(`/course/${course.id}`);
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Xem khóa học
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}