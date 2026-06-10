"use client";

import { BookOpen, CheckCircle2, Clock } from "lucide-react";
import { CourseProgress } from "@/lib/types";

interface Props {
  progress: CourseProgress | null;
  loading?: boolean;
}

export default function CourseProgressDisplay({ progress, loading }: Props) {
  if (loading) {
    return (
      <div className="px-4 py-4 border-b border-slate-100 space-y-3 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-2 bg-slate-200 rounded w-full" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div className="text-xs font-semibold text-slate-500">Chưa có dữ liệu tiến độ</div>
      </div>
    );
  }

  const completionPercentage = progress.progressPercentage || 0;
  const isCompleted = progress.completed;

  return (
    <div className="px-4 py-4 bg-gradient-to-br from-blue-50 to-slate-50 border-b border-slate-200 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-800 truncate">{progress.courseTitle}</div>
          <div className="text-xs text-slate-500 mt-1">
            {isCompleted ? (
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <CheckCircle2 size={12} /> Hoàn thành
              </span>
            ) : (
              <span>
                {progress.completedLessons} / {progress.totalLessons} bài học
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-600">Tiến độ khóa học</span>
          <span className="text-sm font-bold text-blue-600">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <div className="flex items-center gap-2 text-xs bg-white rounded-lg p-2 border border-slate-200">
          <BookOpen size={12} className="text-blue-500" />
          <div>
            <div className="font-bold text-slate-800">{progress.completedLessons}</div>
            <div className="text-slate-400">bài học</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white rounded-lg p-2 border border-slate-200">
          <Clock size={12} className="text-orange-500" />
          <div>
            <div className="font-bold text-slate-800">{Math.round(progress.totalWatchTimeSeconds / 60)}m</div>
            <div className="text-slate-400">thời gian</div>
          </div>
        </div>
      </div>

      {progress.lastAccessedAt && (
        <div className="text-xs text-slate-500 pt-1">
          Cập nhật:{" "}
          {new Date(progress.lastAccessedAt).toLocaleDateString("vi-VN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}
