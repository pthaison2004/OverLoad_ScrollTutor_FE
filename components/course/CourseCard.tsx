"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Course, UserCourse, getCourseColor, LEVEL_MAP } from "@/lib/types";
import CoursePopup from "./CoursePopup";

interface Props {
  course: Course | UserCourse;
  showProgress?: boolean;
}

function isUserCourse(course: Course | UserCourse): course is UserCourse {
  return "progressPercentage" in course;
}

export default function CourseCard({ course, showProgress = false }: Props) {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [checking] = useState(false);
  const color = getCourseColor(course);
  const levelInfo = LEVEL_MAP[course.level] ?? { label: course.level, badge: "free" };
  const isFree = levelInfo.badge === "free";
  const hasProgress = showProgress && isUserCourse(course);
  const progressPercentage = hasProgress ? course.progressPercentage : 0;
  const isCompleted = hasProgress ? course.isCompleted : false;

  const handleClick = () => {
    const courseId = isUserCourse(course) ? course.courseId : course.id;
    router.push(`/course/${courseId}`);
  };

  return (
    <>
      <div
        className={`course-card block cursor-pointer ${checking ? "opacity-70 pointer-events-none" : ""}`}
        onClick={handleClick}
      >
        <div className={`h-36 bg-gradient-to-br ${color} relative flex items-end justify-end p-3 overflow-hidden`}>
          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute bottom-[-15px] left-[-15px] w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute top-3 left-3">
            <div className="text-white font-bold text-sm">{course.title}</div>
            <div className="text-white/80 text-xs mt-0.5">{course.category}</div>
          </div>
          <span className="text-white/30 font-bold text-3xl z-10">{course.level[0]}</span>
        </div>

        <div className="p-3">
          <div className="font-semibold text-sm text-slate-800 mb-2 line-clamp-1">{course.title}</div>

          {hasProgress && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600">Tiến độ</span>
                <span className="text-xs font-bold text-blue-600">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isCompleted ? "bg-green-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {course.completedLessons}/{course.totalLessons} bài học
              </div>
              {isCompleted && (
                <div className="flex items-center gap-1 mt-1 text-green-600">
                  <CheckCircle2 size={12} />
                  <span className="text-xs font-semibold">Hoàn thành</span>
                </div>
              )}
            </div>
          )}

          {isFree && !isCompleted ? (
            <div className="flex justify-center">
              <span className="badge-free">Miễn phí</span>
            </div>
          ) : isCompleted ? (
            <div className="flex justify-center">
              <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                Đã hoàn thành
              </span>
            </div>
          ) : (
            <>
              <button className="w-full text-center py-1.5 rounded-xl border border-orange-200 text-orange-500 text-sm font-semibold hover:bg-orange-50 transition-colors">
                Trả phí
              </button>
              <div className="flex gap-1 mt-2 justify-center">
                {levelInfo.badge === "plus" && <span className="badge-plus">Plus</span>}
                {levelInfo.badge === "pro" && (
                  <>
                    <span className="badge-plus">Plus</span>
                    <span className="badge-pro">Pro</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showPopup && !isUserCourse(course) && <CoursePopup course={course} onClose={() => setShowPopup(false)} />}
    </>
  );
}
