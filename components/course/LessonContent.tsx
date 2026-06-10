"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import parse, { domToReact, Element } from "html-react-parser";
import { Course, Lesson } from "@/lib/types";
import { BookOpen, MessageSquare, User, Clock, Users, Play, RotateCcw, Check, Loader2 } from "lucide-react";
import CodeEditor from "./CodeEditor";
import LivePreview from "./LivePreview";
import { getUser } from "@/lib/auth";
import { progressApi } from "@/lib/api";
import { useLessonProgress } from "@/lib/useLessonProgress";

interface Props {
  lesson: Lesson;
  course: Course;
  activeTab: "desc" | "qa" | "author";
  onTabChange: (tab: "desc" | "qa" | "author") => void;
  onLessonCompleted?: (lessonId: number) => void;
  initialCompleted?: boolean;
}

interface CheckpointData {
  stepIndex: number;
  question: string;
  correctAnswer: string;
  percentage: number;
}

interface CheckpointOverlayProps {
  question: string;
  correctAnswer: string;
  onSolve: () => void;
}

function CheckpointOverlay({ question, correctAnswer, onSolve }: CheckpointOverlayProps) {
  const [value, setValue] = useState("");
  const [isError, setIsError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
      setIsError(false);
      onSolve();
    } else {
      setIsError(true);
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
      <div className="bg-white/95 border border-white/60 p-8 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-blue-50 text-blue-600 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
          Thử thách Q&A
        </div>
        <h3 className="text-slate-800 font-bold text-lg mb-6 leading-snug">
          {question}
        </h3>
        <form onSubmit={handleSubmit} className="w-full">
          <input
            type="text"
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => {
              setValue(e.target.value);
              setIsError(false);
            }}
            placeholder="Nhập câu trả lời của bạn..."
            className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-xl text-sm focus:outline-none transition-all ${
              isError
                ? "border-red-500 focus:ring-4 focus:ring-red-100"
                : isFocused
                ? "border-blue-500 focus:ring-4 focus:ring-blue-100"
                : "border-slate-200 focus:border-blue-500"
            }`}
            autoFocus
          />
          {isError && (
            <p className="text-red-500 text-xs font-semibold mt-2 flex items-center justify-center gap-1">
              ⚠️ Câu trả lời chưa chính xác. Hãy thử lại!
            </p>
          )}
          <button
            type="submit"
            className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
          >
            Kiểm tra đáp án
          </button>
        </form>
      </div>
    </div>
  );
}

// Detect language from lesson template (simple heuristic)
function detectLanguage(code: string): string {
  if (code.includes("<html") || code.includes("<div") || code.includes("<p>")) return "html";
  if (code.includes("{") && code.includes(":") && !code.includes("function")) return "css";
  return "javascript";
}

export default function LessonContent({
  lesson,
  course,
  activeTab,
  onTabChange,
  onLessonCompleted,
  initialCompleted = false,
}: Props) {
  const defaultLanguage = lesson.language || detectLanguage(lesson.template ?? "");
  const [selectedLanguage, setSelectedLanguage] = useState<"javascript" | "html" | "css">(defaultLanguage as "javascript" | "html" | "css");
  const [userCode, setUserCode] = useState(lesson.template ?? "");
  const [runKey, setRunKey] = useState(0);
  const [editorHeight, setEditorHeight] = useState(50); // percentage
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Parse all <pre> blocks from content as steps
  function getAllPreCodes(html: string): string[] {
    const results: string[] = [];
    const regex = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      results.push(
        match[1]
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .trim()
      );
    }
    return results;
  }

  const allSteps = useMemo(() => (lesson.content ? getAllPreCodes(lesson.content) : []), [lesson.content]);
  const totalSteps = allSteps.length;

  const leftScrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(false);

  // Scroll tracking and locking states
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [completedCheckpoints, setCompletedCheckpoints] = useState<number[]>([]);
  const [activeCheckpoint, setActiveCheckpoint] = useState<CheckpointData | null>(null);

  const lockPositionRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef(0);

  const user = getUser();
  const userId = user?.id;

  // Load progress from backend
  useEffect(() => {
    if (!userId || !lesson.id) {
      setCompletedCheckpoints([]);
      setIsLocked(false);
      setScrollPercentage(0);
      return;
    }

    // Skip if no auth token
    const token = typeof window !== "undefined" ? localStorage.getItem("ol_access_token") : null;
    if (!token) return;

    progressApi.getUserLesson(userId, lesson.id)
      .then((res) => {
        if (res) {
          const completedCount = res.unlockedCheckpointIndex;
          const completedList: number[] = [];
          for (let i = 0; i < completedCount; i++) {
            completedList.push(i);
          }
          setCompletedCheckpoints(completedList);
          setIsLocked(false);

          // Restore scroll position
          setTimeout(() => {
            const container = leftScrollContainerRef.current;
            if (container && res.lastScrollPercentage > 0) {
              const scrollHeight = container.scrollHeight - container.clientHeight;
              container.scrollTop = (res.lastScrollPercentage / 100) * scrollHeight;
              setScrollPercentage(res.lastScrollPercentage);
            }
          }, 300);
        }
      })
      .catch(() => {
        // Silently ignore auth/network errors
      });
  }, [lesson.id, userId]);

  // Save progress helper
  const saveProgress = (percentage: number, completedCount: number, isFinished = false) => {
    if (!userId || !lesson.id) return;
    // Skip if no auth token
    const token = typeof window !== "undefined" ? localStorage.getItem("ol_access_token") : null;
    if (!token) return;
    progressApi.upsert({
      userId,
      lessonId: lesson.id,
      lastScrollPercentage: percentage,
      unlockedCheckpointIndex: completedCount,
      completed: isFinished || percentage >= 98,
      lastPositionSeconds: 0,
      watchTimeSeconds: 0
    }).catch(() => { /* silently ignore */ });
  };

  // Reset editor code & language whenever the lesson changes
  useEffect(() => {
    const lang = lesson.language || detectLanguage(lesson.template ?? lesson.content ?? "");
    setSelectedLanguage(lang as "javascript" | "html" | "css");
    setActiveStepIndex(0);

    let code = lesson.template ?? "";
    if (!code && allSteps.length > 0) {
      code = allSteps[0];
    }
    setUserCode(code);
    setRunKey(k => k + 1);
  }, [lesson.id, allSteps]);

  // Parse checkpoints from lesson content
  const checkpoints = useMemo(() => {
    if (!lesson.content) return [];
    
    const checkpointsList: CheckpointData[] = [];
    const preRegex = /<pre[^>]*>[\s\S]*?<\/pre>/gi;
    const checkpointRegex = /<checkpoint\s+([^>]*?)>/gi;
    
    const preMatches = [...lesson.content.matchAll(preRegex)];
    const checkpointMatches = [...lesson.content.matchAll(checkpointRegex)];
    
    checkpointMatches.forEach((match) => {
      const matchIndex = match.index ?? 0;
      // Find how many pre blocks appear before this checkpoint match
      const preCountBefore = preMatches.filter(pm => (pm.index ?? 0) < matchIndex).length;
      const stepIndex = Math.max(0, preCountBefore - 1);
      
      const attrString = match[1];
      const questionMatch = attrString.match(/question="([^"]*)"/i);
      const answerMatch = attrString.match(/answer="([^"]*)"/i);
      const percentageMatch = attrString.match(/percentage="([^"]*)"/i);
      
      if (questionMatch && answerMatch) {
        checkpointsList.push({
          stepIndex,
          question: questionMatch[1],
          correctAnswer: answerMatch[1],
          percentage: percentageMatch ? parseFloat(percentageMatch[1]) : 99
        });
      }
    });
    
    return checkpointsList;
  }, [lesson.content]);

  // Split HTML into step chunks
  const stepChunks = useMemo(() => {
    let cleanHtml = lesson.content ? lesson.content.replace(/<checkpoint[^>]*>[\s\S]*?<\/checkpoint>/gi, "") : "";
    cleanHtml = cleanHtml.trim();
    
    // Strip outer wrapping div if it exists
    if (cleanHtml.startsWith("<div") && cleanHtml.endsWith("</div>")) {
      const firstClose = cleanHtml.indexOf(">");
      const lastOpen = cleanHtml.lastIndexOf("<");
      if (firstClose !== -1 && lastOpen !== -1 && lastOpen > firstClose) {
        cleanHtml = cleanHtml.slice(firstClose + 1, lastOpen).trim();
      }
    }
    
    if (!cleanHtml) return [];
    
    const regex = /([\s\S]*?<pre[^>]*>[\s\S]*?<\/pre>)/gi;
    const matches = [...cleanHtml.matchAll(regex)];
    
    if (matches.length === 0) {
      return [cleanHtml];
    }
    
    const chunks = matches.map(m => m[0]);
    
    const lastIndex = matches[matches.length - 1].index ?? 0;
    const lastMatchLength = matches[matches.length - 1][0].length;
    const leftover = cleanHtml.slice(lastIndex + lastMatchLength).trim();
    
    if (leftover && leftover.replace(/<\/?div[^>]*>/gi, "").trim()) {
      chunks[chunks.length - 1] += leftover;
    }
    
    return chunks;
  }, [lesson.content]);

  // Load step into editor
  function loadStep(stepIndex: number, code: string, scroll = true) {
    // Check if the target step is locked behind an unsolved checkpoint
    const hasUnsolvedCheckpointBefore = checkpoints.some(
      cp => cp.stepIndex < stepIndex && !completedCheckpoints.includes(cp.stepIndex)
    );
    if (hasUnsolvedCheckpointBefore) {
      return;
    }

    setActiveStepIndex(stepIndex);
    setUserCode(code);
    setRunKey(k => k + 1);

    if (scroll) {
      const el = document.getElementById(`step-card-${stepIndex}`);
      if (el) {
        isAutoScrollingRef.current = true;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 800);
      }
    }
  }

  // Scroll spy: update active step as user scrolls down the content
  useEffect(() => {
    const container = leftScrollContainerRef.current;
    if (!container || allSteps.length <= 1) return;

    const observerOptions = {
      root: container,
      rootMargin: "-25% 0px -45% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      if (isAutoScrollingRef.current || isLocked) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const indexAttr = entry.target.getAttribute("data-step-index");
          if (indexAttr !== null) {
            const stepIdx = parseInt(indexAttr, 10);
            const stepCode = allSteps[stepIdx];
            if (stepCode !== undefined) {
              setActiveStepIndex((prevIdx) => {
                if (prevIdx !== stepIdx) {
                  setUserCode(stepCode);
                  setRunKey((k) => k + 1);
                  return stepIdx;
                }
                return prevIdx;
              });
            }
          }
        }
      });
    }, observerOptions);

    const stepElements = container.querySelectorAll(".step-block-wrapper");
    stepElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [lesson.id, allSteps, isLocked]);

  // Checkpoint detection and locking
  useEffect(() => {
    if (isLocked) return;

    const pendingCheckpoint = checkpoints.find(
      cp => cp.stepIndex <= activeStepIndex && !completedCheckpoints.includes(cp.stepIndex)
    );

    if (pendingCheckpoint) {
      setIsLocked(true);
      if (leftScrollContainerRef.current) {
        lockPositionRef.current = leftScrollContainerRef.current.scrollTop;
      }
      setActiveCheckpoint(pendingCheckpoint);
    }
  }, [activeStepIndex, checkpoints, completedCheckpoints, isLocked]);

  const handleSolveCheckpoint = () => {
    if (!activeCheckpoint) return;
    const newCompleted = [...completedCheckpoints, activeCheckpoint.stepIndex];
    setCompletedCheckpoints(newCompleted);
    setIsLocked(false);
    lockPositionRef.current = null;
    setActiveCheckpoint(null);

    // Save progress immediately
    saveProgress(scrollPercentage, newCompleted.length);
  };

  const handleScroll = () => {
    const container = leftScrollContainerRef.current;
    if (!container) return;

    if (isLocked && lockPositionRef.current !== null) {
      container.scrollTop = lockPositionRef.current;
      return;
    }

    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const percentage = scrollHeight > 0 
      ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100))
      : 0;

    setScrollPercentage(percentage);

    // Throttled save progress
    const now = Date.now();
    if (now - lastSaveTimeRef.current > 5000) {
      lastSaveTimeRef.current = now;
      saveProgress(percentage, completedCheckpoints.length);
    }
  };

  const dividerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const verticalDividerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(50); // percentage for left column
  const leftWidthRef = useRef(leftWidth);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [message, setMessage] = useState("");
  const { markLessonComplete, savingLessonId } = useLessonProgress();
  const isSavingProgress = savingLessonId === lesson.id;
  // Drag handling using pointer events for reliability
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const editorHeightRef = useRef(editorHeight);

  useEffect(() => {
    editorHeightRef.current = editorHeight;
  }, [editorHeight]);

  useEffect(() => {
    leftWidthRef.current = leftWidth;
  }, [leftWidth]);

  useEffect(() => {
    setIsCompleted(initialCompleted);
    setMessage("");
  }, [lesson.id, initialCompleted]);

  const handleMarkLessonComplete = async () => {
    const user = getUser();
    if (!user) {
      setMessage("Vui lòng đăng nhập để lưu tiến trình");
      return;
    }

    try {
      await markLessonComplete({ userId: user.id, lesson });
      setIsCompleted(true);
      setMessage("Đã đánh dấu hoàn thành bài học");
      onLessonCompleted?.(lesson.id);
      window.setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể lưu tiến trình");
      window.setTimeout(() => setMessage(""), 3000);
    }
  };

  useEffect(() => {
    // Use an effect that mounts once to avoid reattaching listeners during drag
    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !containerRef.current || startHeightRef.current == null) return;
      const rect = containerRef.current.getBoundingClientRect();
      const delta = e.clientY - startYRef.current;
      const newHeightPx = (startHeightRef.current / 100) * rect.height + delta;
      const newHeight = (newHeightPx / rect.height) * 100;
      if (newHeight >= 10 && newHeight <= 90) setEditorHeight(newHeight);
    };

    const finishDrag = () => {
      isDraggingRef.current = false;
      startHeightRef.current = null;
      pointerIdRef.current = null;
      (document.body as HTMLBodyElement).style.userSelect = "auto";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    const onPointerUp = () => {
      try {
        if (pointerIdRef.current != null && dividerRef.current?.releasePointerCapture) {
          dividerRef.current.releasePointerCapture(pointerIdRef.current);
        }
      } catch {}
      finishDrag();
    };

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      startYRef.current = e.clientY;
      startHeightRef.current = editorHeightRef.current ?? editorHeight;
      pointerIdRef.current = (e as any).pointerId ?? null;
      (document.body as HTMLBodyElement).style.userSelect = "none";

      try {
        if (dividerRef.current?.setPointerCapture && pointerIdRef.current != null) {
          dividerRef.current.setPointerCapture(pointerIdRef.current);
        }
      } catch {}

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    };

    const divider = dividerRef.current;
    if (divider) divider.addEventListener("pointerdown", onPointerDown);
    return () => {
      if (divider) divider.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  useEffect(() => {
    const isDraggingVRef = { current: false } as { current: boolean };
    const startXRef = { current: 0 } as { current: number };
    const startLeftRef = { current: 0 } as { current: number };
    const pointerIdVRef = { current: null as number | null };

    const onMove = (e: PointerEvent) => {
      if (!isDraggingVRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const delta = e.clientX - startXRef.current;
      const newLeftPx = (startLeftRef.current / 100) * rect.width + delta;
      const newLeft = (newLeftPx / rect.width) * 100;
      if (newLeft >= 15 && newLeft <= 85) setLeftWidth(newLeft);
    };

    const finish = () => {
      isDraggingVRef.current = false;
      pointerIdVRef.current = null;
      (document.body as HTMLBodyElement).style.userSelect = "auto";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    const onUp = () => {
      try {
        if (pointerIdVRef.current != null && verticalDividerRef.current?.releasePointerCapture) {
          verticalDividerRef.current.releasePointerCapture(pointerIdVRef.current);
        }
      } catch {}
      finish();
    };

    const onDown = (e: PointerEvent) => {
      isDraggingVRef.current = true;
      startXRef.current = e.clientX;
      startLeftRef.current = leftWidthRef.current ?? leftWidth;
      pointerIdVRef.current = (e as any).pointerId ?? null;
      (document.body as HTMLBodyElement).style.userSelect = "none";
      try {
        if (verticalDividerRef.current?.setPointerCapture && pointerIdVRef.current != null) {
          verticalDividerRef.current.setPointerCapture(pointerIdVRef.current);
        }
      } catch {}
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };

    const vdiv = verticalDividerRef.current;
    if (vdiv) vdiv.addEventListener("pointerdown", onDown);
    return () => {
      if (vdiv) vdiv.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const tabs = [
    { id: "desc" as const, label: "Mô tả", icon: BookOpen },
    { id: "qa" as const, label: "Hỏi & Đáp", icon: MessageSquare },
    { id: "author" as const, label: "Ghi chú", icon: User },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-100 bg-white shrink-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-50 border-b border-slate-100 px-6 py-2 shrink-0 flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiến trình</span>
          <div className="flex-1 h-2 bg-slate-200/60 rounded-full overflow-hidden border border-slate-200/20">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${scrollPercentage}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-bold text-blue-600 min-w-[32px] text-right">
          {Math.round(scrollPercentage)}%
        </span>
      </div>

      {/* Tab: Mô tả */}
      {activeTab === "desc" && (
        <div ref={containerRef} className="flex-1 overflow-hidden flex flex-row">
          {/* Left: Content Wrapper */}
          <div style={{ width: `${leftWidth}%` }} className="border-r border-slate-100 flex flex-row overflow-hidden h-full bg-white relative">
            
            {/* Left Child: Vertical Timeline */}
            {totalSteps > 1 && (
              <div className="w-10 shrink-0 flex flex-col items-center py-8 bg-slate-50/30 border-r border-slate-100/50 relative h-full">
                <div className="absolute top-8 bottom-8 w-[2px] bg-slate-100" />
                <div
                  className="absolute top-8 w-[2px] bg-blue-500 transition-all duration-500 ease-out"
                  style={{
                    height: totalSteps > 1 ? `${(activeStepIndex / (totalSteps - 1)) * 100}%` : "0%",
                    maxHeight: "calc(100% - 64px)"
                  }}
                />
                <div className="absolute top-8 bottom-8 flex flex-col justify-between items-center w-full">
                  {allSteps.map((_, i) => {
                    const isActive = i === activeStepIndex;
                    const isPassed = i < activeStepIndex;
                    return (
                      <button
                        key={i}
                        onClick={() => loadStep(i, allSteps[i])}
                        className={`w-4 h-4 rounded-full z-10 flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? "bg-blue-600 border-[3px] border-blue-100 scale-125 shadow-md shadow-blue-200"
                            : isPassed
                            ? "bg-blue-500 border-2 border-transparent"
                            : "bg-white border-2 border-slate-300 hover:border-slate-400"
                        }`}
                        title={`Bước ${i + 1}`}
                      >
                        {isActive && <div className="w-1 h-1 rounded-full bg-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Right Child: Scrollable Lesson Text Content */}
            <div
              ref={leftScrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth"
            >
              {/* Introduction Card */}
              <div className="border border-slate-100 bg-slate-50/30 p-6 rounded-2xl">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-xl font-bold text-slate-800">{lesson.title}</h2>
                  {isCompleted && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full shrink-0">
                      <Check size={16} className="text-green-600" />
                      <span className="text-xs font-semibold text-green-600">Hoàn thành</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock size={13} /> {lesson.durationMinutes} phút
                  </span>
                  {lesson.isFree && (
                    <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                      Miễn phí
                    </span>
                  )}
                </div>

                {message && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    {message}
                  </div>
                )}

                {lesson.description && (
                  <p className="text-sm text-slate-600 leading-relaxed">{lesson.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <BookOpen size={16} className="text-orange-500" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{course.level}</div>
                      <div className="text-[10px] text-slate-400">Trình độ</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <Users size={16} className="text-orange-500" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">{course.category}</div>
                      <div className="text-[10px] text-slate-400">Danh mục</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step chunks rendered as premium cards */}
              {stepChunks.length > 0 && (
                <div className="pb-[40vh] space-y-16">
                  {stepChunks.map((chunk, stepIdx) => {
                    const isActive = stepIdx === activeStepIndex;
                    const stepCode = allSteps[stepIdx] ?? "";
                    return (
                      <div
                        key={stepIdx}
                        className={`step-block-wrapper p-8 border-2 rounded-[24px] transition-all duration-500 ease-out cursor-pointer relative ${
                          isActive
                            ? "opacity-100 scale-[1.02] border-blue-500 shadow-xl bg-gradient-to-br from-white to-blue-50/20"
                            : "opacity-40 scale-[0.98] border-slate-200 bg-white hover:opacity-60"
                        }`}
                        data-step-index={stepIdx}
                        id={`step-card-${stepIdx}`}
                        onClick={() => loadStep(stepIdx, stepCode)}
                      >
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                          <span
                            className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider transition-colors duration-300 ${
                              isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            Bước {stepIdx + 1} / {stepChunks.length}
                          </span>
                          {isActive && (
                            <span className="text-xs font-bold text-blue-600 animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                              Đang chạy
                            </span>
                          )}
                        </div>

                        <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
                          <style>{`
                            .step-content div, .step-content p, .step-content span, .step-content h1, .step-content h2, .step-content h3, .step-content h4, .step-content h5, .step-content h6, .step-content li, .step-content ul, .step-content ol, .step-content strong, .step-content b, .step-content em, .step-content i { font-family: inherit !important; }
                            .step-content h1 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.75rem; color: #1e293b; }
                            .step-content h2 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #334155; }
                            .step-content h3 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.5rem; color: #475569; }
                            .step-content p { margin: 0.75rem 0; line-height: 1.6; }
                            .step-content code { background: #f1f5f9; color: #e11d48; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.875em; }
                            .step-content pre code { background: none; color: inherit; padding: 0; border-radius: 0; font-size: 0.8125rem; line-height: 1.7; }
                          `}</style>
                          <div className="step-content">
                            {parse(chunk, {
                              replace(node) {
                                if (node instanceof Element && node.name === "pre") {
                                  return (
                                    <pre
                                      className={`bg-slate-900 text-slate-100 p-4 rounded-xl whitespace-pre-wrap break-all border transition-colors ${
                                        isActive ? "border-blue-400" : "border-slate-800"
                                      }`}
                                    >
                                      <code>{domToReact(node.children as any)}</code>
                                    </pre>
                                  );
                                }
                              }
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Checkpoint Overlay */}
            {isLocked && activeCheckpoint && (
              <CheckpointOverlay
                question={activeCheckpoint.question}
                correctAnswer={activeCheckpoint.correctAnswer}
                onSolve={handleSolveCheckpoint}
              />
            )}

            {!isCompleted && (
              <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                <button
                  onClick={handleMarkLessonComplete}
                  disabled={isSavingProgress}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors text-base"
                >
                  {isSavingProgress ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Dang luu...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Danh dau hoan thanh bai hoc
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Vertical divider: draggable to resize left/right */}
          <div
            ref={verticalDividerRef}
            className="w-2 cursor-col-resize shrink-0 transition-colors"
            style={{ background: 'transparent' }}
          />

          {/* Right: Code Editor + Preview (vertical split) */}
          <div style={{ width: `${100 - leftWidth}%` }} className="overflow-hidden flex flex-col border-l border-slate-100">
            {/* Top: Code Editor */}
            <div style={{ height: `${editorHeight}%` }} className="overflow-hidden flex flex-col border-b border-slate-100">
              <div className="flex items-center justify-between px-4 py-2 shrink-0 bg-white border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Soạn thảo code</span>
                  {totalSteps > 1 && (
                    <span className="text-xs bg-blue-100 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
                      Step {activeStepIndex + 1}/{totalSteps}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadStep(0, allSteps[0] ?? "")}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                  <button
                    onClick={() => setRunKey(k => k + 1)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded-md font-semibold"
                  >
                    <Play size={11} fill="white" /> Chạy
                  </button>
                </div>
              </div>

              <div className="bg-[#1e293b] px-4 py-2 flex items-center gap-3 shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as "javascript" | "html" | "css")}
                  className="ml-2 bg-transparent text-slate-300 text-xs font-medium border border-slate-500 rounded px-2 py-1 cursor-pointer hover:border-slate-400 focus:outline-none focus:border-blue-400"
                >
                  <option value="javascript">JavaScript (script.js)</option>
                  <option value="html">HTML (index.html)</option>
                  <option value="css">CSS (style.css)</option>
                </select>
              </div>

              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  value={userCode}
                  language={selectedLanguage}
                  onChange={setUserCode}
                />
              </div>
            </div>

            {/* Resizable Divider */}
            <div
              ref={dividerRef}
              className="h-1 bg-slate-300 hover:bg-blue-500 cursor-row-resize shrink-0 transition-colors"
            />

            {/* Bottom: Live Preview */}
            <div style={{ height: `${100 - editorHeight}%` }} className="overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50 shrink-0">
                <span className="text-xs font-semibold text-slate-500">KẾT QUẢ</span>
                <button
                  onClick={() => setRunKey(k => k + 1)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Play size={10} /> Chạy lại
                </button>
              </div>
              <div className="flex-1 overflow-hidden bg-white">
                <LivePreview code={userCode} language={selectedLanguage} runKey={runKey} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "qa" && (
        <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-2">
          <MessageSquare size={36} className="text-slate-200" />
          <p className="text-sm">Chưa có câu hỏi nào.</p>
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors">
            Đặt câu hỏi
          </button>
        </div>
      )}

      {activeTab === "author" && (
        <div className="flex-1 p-6 overflow-y-auto">
          <h3 className="font-semibold text-slate-700 mb-2">Ghi chú của bạn</h3>
          <textarea
            className="w-full h-48 input-field resize-none"
            placeholder="Ghi chú của bạn về bài học này..."
          />
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors">
            Lưu ghi chú
          </button>
        </div>
      )}
    </div>
  );
}


