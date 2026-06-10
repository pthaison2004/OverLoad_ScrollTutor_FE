"use client";

import { useCallback, useState } from "react";
import { coursesApi, progressApi } from "@/lib/api";
import { CourseProgress, Lesson, LessonProgress } from "@/lib/types";

interface MarkLessonCompleteParams {
  userId: number;
  lesson: Pick<Lesson, "id" | "durationMinutes">;
}

export function useLessonProgress(courseId?: number) {
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [savingLessonId, setSavingLessonId] = useState<number | null>(null);

  const loadCourseProgress = useCallback(
    async (nextCourseId = courseId) => {
      if (!nextCourseId) return null;

      try {
        setProgressLoading(true);
        setProgressError("");
        const progress = await coursesApi.getCourseProgress(nextCourseId);
        setCourseProgress(progress);
        return progress;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load course progress";
        setProgressError(message);
        return null;
      } finally {
        setProgressLoading(false);
      }
    },
    [courseId]
  );

  const markLessonComplete = useCallback(
    async ({ userId, lesson }: MarkLessonCompleteParams): Promise<LessonProgress> => {
      setSavingLessonId(lesson.id);
      try {
        const progress = await progressApi.upsertV2({
          userId,
          lessonId: lesson.id,
          lastScrollPercentage: 100,
          completed: true,
          watchTimeSeconds: Math.floor(lesson.durationMinutes * 60),
        });

        if (courseId) {
          await loadCourseProgress(courseId);
        }

        return progress;
      } finally {
        setSavingLessonId(null);
      }
    },
    [courseId, loadCourseProgress]
  );

  return {
    courseProgress,
    setCourseProgress,
    progressLoading,
    progressError,
    savingLessonId,
    loadCourseProgress,
    markLessonComplete,
  };
}
