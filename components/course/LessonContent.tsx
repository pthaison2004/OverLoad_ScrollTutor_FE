"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  checkpoints: CheckpointData[];
  completedCheckpoints: number[];
  onSolveAll: (solvedIndexes: number[]) => void;
}

function CheckpointOverlay({ checkpoints, completedCheckpoints, onSolveAll }: CheckpointOverlayProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, boolean>>({});
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Decode HTML helper
  const decodeHtml = (html: string) => {
    if (typeof window === "undefined") return html;
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  // Process checkpoint helper
  const processCheckpoint = (cp: CheckpointData) => {
    const decoded = decodeHtml(cp.question);
    let desc = "";
    let code = decoded;
    const colonIdx = decoded.indexOf(":");
    if (colonIdx !== -1) {
      desc = decoded.substring(0, colonIdx + 1).trim();
      code = decoded.substring(colonIdx + 1).trim();
    }
    const hasBlank = /_{3,}/.test(code);
    const parts = hasBlank ? code.split(/_{3,}/) : [];
    const prefix = parts[0] ?? "";
    const suffix = parts[1] ?? "";
    return { descriptionText: desc, codeLine: code, hasBlank, prefix, suffix };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let allValid = true;
    const newErrors: Record<number, boolean> = {};
    const solvedThisTime: number[] = [];

    checkpoints.forEach(cp => {
      const isCompleted = completedCheckpoints.includes(cp.stepIndex);
      if (isCompleted) return;

      const userAns = answers[cp.stepIndex] ?? "";
      const isCorrect = userAns.trim().toLowerCase() === cp.correctAnswer.trim().toLowerCase();
      if (isCorrect) {
        newErrors[cp.stepIndex] = false;
        solvedThisTime.push(cp.stepIndex);
      } else {
        newErrors[cp.stepIndex] = true;
        allValid = false;
      }
    });

    setErrors(newErrors);
    if (allValid) {
      onSolveAll(solvedThisTime);
    }
  };

  const renderHighlightedCode = (text: string) => {
    const tokens = text.split(/(\s+|\b|[{}\[\]()<>:;.,&|=+\-*\/%?]+)/g);
    return tokens.map((part, idx) => {
      if (!part) return null;
      const isKw = /^(builder|Services|var|const|let|function|class|public|private|readonly|return|await|async|new|null|true|false|void|this|using|override|protected|interface|enum|static|abstract)$/i.test(part);
      const isSqlKw = /^(SELECT|FROM|WHERE|ORDER|BY|CREATE|TABLE|PRIMARY|KEY|LIKE|OFFSET|FETCH|ROWS|ONLY|INNER|LEFT|JOIN|ON|GROUP|NOT|IN|INSERT|UPDATE|DELETE|AND|OR|AS|INTO|VALUES|SET|DISTINCT|COUNT|HAVING)$/i.test(part);
      const isType = /^[A-Z][a-zA-Z0-9]*$/.test(part) && !isSqlKw;
      const isNum = /^\d+$/.test(part);
      if (isKw) return <span key={idx} style={{ color: "#c678dd" }}>{part}</span>;
      if (isSqlKw) return <span key={idx} style={{ color: "#61afef", fontWeight: 700 }}>{part}</span>;
      if (isType) return <span key={idx} style={{ color: "#e5c07b" }}>{part}</span>;
      if (isNum) return <span key={idx} style={{ color: "#d19a66" }}>{part}</span>;
      if (/^[{}()<>\[\]]$/.test(part)) return <span key={idx} style={{ color: "#abb2bf" }}>{part}</span>;
      if (/^[.;,=+\-*\/%?:&|]+$/.test(part)) return <span key={idx} style={{ color: "#56b6c2" }}>{part}</span>;
      if (/^".*?"$/.test(part) || /^'.*?'$/.test(part)) return <span key={idx} style={{ color: "#98c379" }}>{part}</span>;
      return <span key={idx} style={{ color: "#abb2bf" }}>{part}</span>;
    });
  };

  const isAnyInputEmpty = checkpoints.some(cp => {
    if (completedCheckpoints.includes(cp.stepIndex)) return false;
    return !(answers[cp.stepIndex] ?? "").trim();
  });

  return (
    <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] z-[100] flex items-center justify-center p-6 select-none animate-in fade-in duration-300">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl overflow-hidden w-full max-w-lg max-h-full flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-2 border-indigo-500/50 animate-in zoom-in-95 duration-200"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: "#21252b" }}>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
            <span className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
            <span className="w-3 h-3 rounded-full" style={{ background: "#10b981" }} />
            <span style={{ color: "#818cf8", fontSize: 12, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", marginLeft: 10 }}>
              ⚡ THỬ THÁCH CUỐI BÀI HỌC
            </span>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: "#1e1e24" }}>
          <p className="text-slate-400 text-xs leading-relaxed border-b border-slate-800 pb-3">
            Để hoàn thành bài học này, bạn cần vượt qua các thử thách nhanh dưới đây. Đáp án đã được ẩn khỏi trình soạn thảo code để đảm bảo tính thử thách.
          </p>

          {checkpoints.map((cp, idx) => {
            const isCompleted = completedCheckpoints.includes(cp.stepIndex);
            const { descriptionText, hasBlank, prefix, suffix } = processCheckpoint(cp);
            const userVal = answers[cp.stepIndex] ?? "";
            const isError = errors[cp.stepIndex] ?? false;
            const isFocused = focusedIndex === cp.stepIndex;

            return (
              <div key={cp.stepIndex} className="space-y-2.5">
                {/* Challenge Number Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-slate-800 text-slate-400">
                    Câu hỏi {idx + 1}
                  </span>
                  {isCompleted && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      ✅ Đã hoàn thành
                    </span>
                  )}
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-800">
                  {/* Question Description */}
                  {descriptionText && (
                    <div style={{ background: "#2c313c" }} className="px-4 py-2.5 border-b border-slate-800">
                      <p style={{ color: "#abb2bf", fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>{descriptionText}</p>
                    </div>
                  )}

                  {/* Code Editor Box */}
                  {isCompleted ? (
                    <div className="flex" style={{ background: "#282c34" }}>
                      <div className="flex flex-col items-end px-2 py-3 select-none shrink-0" style={{ background: "#21252b", color: "#636d83", fontSize: 13, lineHeight: "1.6", minWidth: 36 }}>
                        <span>1</span>
                      </div>
                      <div className="flex items-center flex-wrap px-4 py-3 text-slate-300" style={{ fontSize: 13, lineHeight: "1.6" }}>
                        {hasBlank ? (
                          <>
                            {renderHighlightedCode(prefix)}
                            <span style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 4, padding: "1px 6px", fontWeight: 600, margin: "0 4px" }}>
                              {cp.correctAnswer}
                            </span>
                            {renderHighlightedCode(suffix)}
                          </>
                        ) : (
                          <span style={{ color: "#10b981" }}>{cp.correctAnswer}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex" style={{ background: "#282c34" }}>
                      <div className="flex flex-col items-end px-2 py-3 select-none shrink-0" style={{ background: "#21252b", color: "#636d83", fontSize: 13, lineHeight: "1.6", minWidth: 36 }}>
                        <span>1</span>
                      </div>
                      <div className="flex items-center flex-wrap px-4 py-3 text-slate-300" style={{ fontSize: 13, lineHeight: "1.6" }}>
                        {hasBlank ? (
                          <>
                            {renderHighlightedCode(prefix)}
                            <span style={{ display: "inline-grid", alignItems: "center", position: "relative", margin: "0 3px" }}>
                              <span style={{ gridArea: "1 / 1", visibility: "hidden", whiteSpace: "pre", padding: "2px 8px", fontSize: 13 }}>
                                {userVal.length >= 3 ? userVal : userVal + " ".repeat(3 - userVal.length)}
                              </span>
                              <input
                                type="text"
                                value={userVal}
                                onFocus={() => setFocusedIndex(cp.stepIndex)}
                                onBlur={() => setFocusedIndex(null)}
                                onChange={(e) => {
                                  setAnswers(prev => ({ ...prev, [cp.stepIndex]: e.target.value }));
                                  setErrors(prev => ({ ...prev, [cp.stepIndex]: false }));
                                }}
                                className="outline-none"
                                style={{
                                  gridArea: "1 / 1",
                                  background: isError ? "rgba(239,68,68,0.15)" : isFocused ? "rgba(99,102,241,0.15)" : "#3e4451",
                                  border: `1.5px solid ${isError ? "#ef4444" : isFocused ? "#818cf8" : "#4b5563"}`,
                                  borderRadius: 4,
                                  color: isError ? "#fca5a5" : "#e5e7eb",
                                  textAlign: "center",
                                  fontSize: 13,
                                  fontFamily: "inherit",
                                  padding: "2px 8px",
                                  transition: "all 0.15s",
                                }}
                                placeholder="???"
                              />
                            </span>
                            {renderHighlightedCode(suffix)}
                          </>
                        ) : (
                          <input
                            type="text"
                            value={userVal}
                            onFocus={() => setFocusedIndex(cp.stepIndex)}
                            onBlur={() => setFocusedIndex(null)}
                            onChange={(e) => {
                              setAnswers(prev => ({ ...prev, [cp.stepIndex]: e.target.value }));
                              setErrors(prev => ({ ...prev, [cp.stepIndex]: false }));
                            }}
                            placeholder="Nhập câu trả lời..."
                            className="outline-none w-full"
                            style={{
                              background: "#3e4451",
                              border: `1.5px solid ${isError ? "#ef4444" : isFocused ? "#818cf8" : "#4b5563"}`,
                              borderRadius: 6,
                              color: "#e5e7eb",
                              fontSize: 13,
                              fontFamily: "inherit",
                              padding: "6px 12px",
                              transition: "all 0.15s",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Error status info */}
                {isError && (
                  <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 600 }}>
                    ❌ Câu trả lời chưa chính xác, vui lòng kiểm tra lại.
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: "#21252b", borderTop: "1px solid #3e4451" }}>
          <span style={{ color: "#636d83", fontSize: 11 }}>
            Vui lòng giải đúng tất cả câu hỏi để hoàn thành.
          </span>
          <button
            type="submit"
            disabled={isAnyInputEmpty}
            style={{
              background: isAnyInputEmpty ? "#3e4451" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: isAnyInputEmpty ? "#636d83" : "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 22px",
              fontSize: 13,
              fontWeight: 700,
              cursor: isAnyInputEmpty ? "not-allowed" : "pointer",
              opacity: isAnyInputEmpty ? 0.6 : 1,
              transition: "all 0.15s",
              fontFamily: "inherit",
            }}
          >
            Kiểm tra & Hoàn thành 🚀
          </button>
        </div>
      </form>
    </div>
  );
}

// Detect language from lesson template (simple heuristic)
function detectLanguage(code: string): string {
  const trimmed = code.trim();

  // 1. Check HTML FIRST: code that starts with < and is primarily HTML tags
  const looksLikeHtml = trimmed.startsWith("<") || trimmed.includes("<!DOCTYPE") || trimmed.includes("<html") || trimmed.includes("<body");
  if (looksLikeHtml) {
    // Only override to JS if it clearly contains React hooks or module syntax
    const hasReactOrModule = 
      trimmed.includes("useState") || 
      trimmed.includes("useEffect") || 
      trimmed.includes("import ") ||
      trimmed.includes("export default");
    if (!hasReactOrModule) {
      return "html";
    }
  }

  // 2. Check JS: code with clear JavaScript syntax
  if (
    trimmed.includes("import ") || 
    trimmed.includes("export ") || 
    trimmed.includes("useState") || 
    trimmed.includes("useEffect") || 
    trimmed.includes("useRef") ||
    trimmed.includes("useMemo") ||
    trimmed.includes("useCallback") ||
    trimmed.includes("console.log") ||
    /^(const|let|var|function)\s/m.test(trimmed)
  ) {
    return "javascript";
  }

  // 3. Check CSS
  if (trimmed.includes("{") && (trimmed.includes(":") || trimmed.includes(";")) && !trimmed.includes("function")) {
    return "css";
  }

  // 4. Default: if it has HTML-like tags, treat as HTML
  if (/<[a-zA-Z][a-zA-Z0-9]*[\s>]/.test(trimmed)) {
    return "html";
  }

  return "javascript";
}

function formatChunkToHtml(chunk: string): string {
  if (!chunk) return "";

  let text = chunk.trim();
  const codeBlocks: string[] = [];

  // 1. Extract markdown code blocks ```lang ... ``` into placeholders
  text = text.replace(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g, (_match, code) => {
    const escaped = code
      .trim()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
    const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
    codeBlocks.push(`<pre><code>${escaped}</code></pre>`);
    return `\n\n${placeholder}\n\n`;
  });

  // 2. Extract existing <pre>...</pre> blocks into placeholders
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_match, codeContent) => {
    const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
    let cleaned = codeContent;
    if (!cleaned.includes("<code>")) {
      cleaned = `<code>${cleaned}</code>`;
    }
    codeBlocks.push(`<pre>${cleaned}</pre>`);
    return `\n\n${placeholder}\n\n`;
  });

  // 3. Convert Markdown Headings (#, ##, ###)
  text = text.replace(/^###[ \t]+(.*$)/gim, "<h3>$1</h3>");
  text = text.replace(/^##[ \t]+(.*$)/gim, "<h2>$1</h2>");
  text = text.replace(/^#[ \t]+(.*$)/gim, "<h1>$1</h1>");

  // 4. Convert Markdown Inline Code & Bold
  text = text.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // 5. Convert Markdown Lists (- item or * item)
  text = text.replace(/^\s*[-*]\s+(.*$)/gim, "<li>$1</li>");

  // 6. Wrap text blocks in <p> if not already an HTML tag or placeholder
  const blocks = text.split(/\n\s*\n/);
  const formatted = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (/^___CODE_BLOCK_\d+___$/.test(trimmed)) {
      return trimmed;
    }
    if (/^<(h[1-6]|pre|ul|ol|li|div|p)\b/i.test(trimmed)) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
  });

  let result = formatted.filter(Boolean).join("\n");

  // Restore placeholders with original code blocks
  codeBlocks.forEach((codeHtml, idx) => {
    result = result.replace(`___CODE_BLOCK_${idx}___`, codeHtml);
  });

  return result;
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

  // Parse all <pre> or markdown code blocks from content as steps
  function getAllPreCodes(html: string): string[] {
    const results: string[] = [];
    const hasPre = /<pre[^>]*>[\s\S]*?<\/pre>/i.test(html);
    const regex = hasPre
      ? /<pre[^>]*>([\s\S]*?)<\/pre>/gi
      : /```(?:\w+)?\n?([\s\S]*?)```/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const codeStr = match[1] ?? "";
      results.push(
        codeStr
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
  const [completedCheckpoints, setCompletedCheckpoints] = useState<number[]>([]);
  const [isLocked, setIsLocked] = useState(false);

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
    const token = typeof window !== "undefined" ? localStorage.getItem("ol_access_token") : null;
    if (!token) return;

    // Check if there are any unsolved checkpoints
    const hasUnsolved = checkpoints.some(cp => !completedCheckpoints.includes(cp.stepIndex));

    // Capping percentage if there are unsolved checkpoints to prevent unlocking the next lesson
    const finalPercentage = hasUnsolved ? Math.min(percentage, 95) : percentage;
    const finalCompleted = !hasUnsolved && (isFinished || finalPercentage >= 98);

    progressApi.upsert({
      userId,
      lessonId: lesson.id,
      lastScrollPercentage: finalPercentage,
      unlockedCheckpointIndex: completedCount,
      completed: finalCompleted,
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

  // Split HTML or Markdown into step chunks
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
    
    const hasPre = /<pre[^>]*>[\s\S]*?<\/pre>/i.test(cleanHtml);
    const regex = hasPre
      ? /([\s\S]*?<pre[^>]*>[\s\S]*?<\/pre>)/gi
      : /([\s\S]*?```[\s\S]*?```)/gi;

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

  // Checkpoint detection and scroll locking (triggers at 99% scroll progress)
  useEffect(() => {
    if (isLocked) return;

    // Check if there are any unsolved checkpoints
    const hasUnsolved = checkpoints.some(cp => !completedCheckpoints.includes(cp.stepIndex));

    if (hasUnsolved && scrollPercentage >= 98) {
      setIsLocked(true);
      if (leftScrollContainerRef.current) {
        // Lock current scroll position
        lockPositionRef.current = leftScrollContainerRef.current.scrollTop;
      }
    }
  }, [scrollPercentage, checkpoints, completedCheckpoints, isLocked]);

  const handleSolveAllCheckpoints = (solvedIndexes: number[]) => {
    setCompletedCheckpoints(prev => {
      const newCompleted = Array.from(new Set([...prev, ...solvedIndexes]));
      saveProgress(scrollPercentage, newCompleted.length);
      return newCompleted;
    });
    setIsLocked(false);
    lockPositionRef.current = null;
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

  const handleMarkLessonComplete = useCallback(async () => {
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
  }, [lesson, markLessonComplete, onLessonCompleted]);

  useEffect(() => {
    const hasUnsolved = checkpoints.some(cp => !completedCheckpoints.includes(cp.stepIndex));
    if (scrollPercentage >= 99 && !isCompleted && !isSavingProgress && !hasUnsolved) {
      handleMarkLessonComplete();
    }
  }, [scrollPercentage, isCompleted, isSavingProgress, handleMarkLessonComplete, checkpoints, completedCheckpoints]);

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
                            {parse(formatChunkToHtml(chunk), {
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
              {/* Checkpoint Overlay */}
              {isLocked && (
                <CheckpointOverlay
                  checkpoints={checkpoints}
                  completedCheckpoints={completedCheckpoints}
                  onSolveAll={handleSolveAllCheckpoints}
                />
              )}

            </div>
          </div>

          {/* Vertical divider: draggable to resize left/right */}
          <div
            ref={verticalDividerRef}
            className="w-2 cursor-col-resize shrink-0 transition-colors"
            style={{ background: 'transparent' }}
          />

          {/* Right: Code Editor + Preview (vertical split) */}
          <div style={{ width: `${100 - leftWidth}%` }} className="overflow-hidden flex flex-col border-l border-slate-100 relative">
            {/* Lock overlay for editor to prevent cheating */}
            {isLocked && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-8 text-center select-none animate-in fade-in duration-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span className="text-4xl mb-4">🔒</span>
                <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-2" style={{ color: "#818cf8" }}>
                  Trình soạn thảo đã khóa
                </h3>
                <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                  Vui lòng hoàn thành các thử thách nhanh ở cột lý thuyết bên trái để tiếp tục mở khóa và thực hành viết code.
                </p>
              </div>
            )}

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


