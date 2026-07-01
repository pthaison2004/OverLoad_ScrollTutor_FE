"use client";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getToken } from "@/lib/auth";
import { Bot, X, Send, Loader2, MessageCircle, Trash2, ChevronDown } from "lucide-react";

interface Message {
  role: "user" | "model";
  content: string;
  isError?: boolean;
}

interface ChatResponse {
  success: boolean;
  data: {
    reply: string;
    isBlocked: boolean;
    blockReason?: string;
    InputToken: number;
    OutputToken: number;
  };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:53483";

const SUGGESTIONS = [
  "Giải thích lỗi này cho tôi",
  "Code này có vấn đề gì không?",
  "Gợi ý bài học tiếp theo",
  "Flexbox là gì?",
];

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#60a5fa",
          animation: `chatBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const isError = msg.isError === true;
  const [purify, setPurify] = useState<((s: string) => string) | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const DOMPurify = (await import("dompurify")).default;
        if (mounted) setPurify(() => (s: string) => DOMPurify.sanitize(s));
      } catch {
        // ignore, will render as text fallback
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Error message styling (AI limit reached)
  if (isError) {
    return (
      <div style={{
        display: "flex", justifyContent: "flex-start",
        marginBottom: 12, gap: 8, alignItems: "flex-end",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #dc2626, #b91c1c)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Bot size={14} color="white" />
        </div>
        <div style={{
          maxWidth: "78%", padding: "12px 14px",
          borderRadius: "18px 18px 18px 4px",
          background: "rgba(220, 38, 38, 0.12)",
          border: "1px solid rgba(220, 38, 38, 0.3)",
          color: "#fca5a5", fontSize: 13, lineHeight: 1.6,
          wordBreak: "break-word",
        }}>
          <div style={{ marginBottom: 8 }}>{msg.content}</div>
          <a
            href="/pricing"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: "white", fontSize: 12, fontWeight: 700,
              textDecoration: "none", transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            ⚡ Nâng cấp ngay
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 12, gap: 8, alignItems: "flex-end",
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #2563eb, #7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Bot size={14} color="white" />
        </div>
      )}
      <div style={{
        maxWidth: "78%", padding: "10px 14px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "rgba(255,255,255,0.07)",
        color: isUser ? "white" : "#e2e8f0", fontSize: 13.5, lineHeight: 1.6,
        border: isUser ? "none" : "1px solid rgba(255,255,255,0.08)",
        wordBreak: "break-word", whiteSpace: "pre-wrap",
      }}>
        {purify ? (
          <div dangerouslySetInnerHTML={{ __html: purify(msg.content) }} />
        ) : (
          <div>{msg.content}</div>
        )}
      </div>
    </div>
  );
}

export default function AIChatBox() {
  const pathname = usePathname();
  useEffect(() => {
    // debug mount
    try { console.log("AIChatBox mounted, pathname:", pathname); } catch {}
  }, [pathname]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setUnread(0);
    }
  }, [open]);

  // Hide on auth pages
  if (["/login", "/register"].includes(pathname)) return null;

  // On the root path "/", hide only if the user is not logged in (public landing page)
  if (pathname === "/" && typeof window !== "undefined" && !getToken()) return null;

  const getRecentHistory = (): Message[] => messages.slice(-6);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const token = typeof window !== "undefined" ? getToken() : null;
      const res = await fetch(`${BASE_URL}/api/Chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: content, recentHistory: getRecentHistory() }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ChatResponse = await res.json();

      if (data.data.isBlocked) {
        const errorMsg: Message = {
          role: "model",
          content: data.data.blockReason || data.data.reply || "Tin nhắn bị chặn bởi bộ lọc nội dung.",
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      const aiMsg: Message = { role: "model", content: data.data.reply };
      setMessages((prev) => [...prev, aiMsg]);
      if (!open) setUnread((n) => n + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thể kết nối AI");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      <style>{`
        @keyframes chatBounce {
          0%,60%,100% { transform:translateY(0); opacity:0.4; }
          30% { transform:translateY(-6px); opacity:1; }
        }
        @keyframes chatSlideUp {
          from { opacity:0; transform:translateY(16px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes chatPulse {
          0%,100% { box-shadow:0 0 0 0 rgba(37,99,235,0.5); }
          50%     { box-shadow:0 0 0 10px rgba(37,99,235,0); }
        }
        .chat-textarea { outline:none; }
        .chat-textarea::placeholder { color:#475569; }
        .chat-scroll::-webkit-scrollbar { width:4px; }
        .chat-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
        .chip-btn:hover { background:rgba(37,99,235,0.2) !important; border-color:rgba(96,165,250,0.5) !important; }
        .send-btn:hover:not(:disabled) { background:#1d4ed8 !important; }
        .send-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .icon-btn:hover { color:#94a3b8 !important; }
      `}</style>

      {/* Floating trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 99999,
          width: 52, height: 52, borderRadius: "50%", border: "none",
          background: open ? "rgba(30,41,59,0.95)" : "linear-gradient(135deg,#2563eb,#7c3aed)",
          color: "white", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: open ? "0 4px 20px rgba(0,0,0,0.35)" : "0 4px 24px rgba(37,99,235,0.45)",
          transition: "all 0.25s",
          animation: !open && unread === 0 ? "chatPulse 2.5s ease-in-out infinite" : "none",
        }}
          title="Open chat"
          data-testid="aichat-button"
        >
        {open ? <X size={20} /> : <MessageCircle size={22} />}
        {unread > 0 && !open && (
          <div style={{
            position: "absolute", top: -3, right: -3,
            width: 18, height: 18, borderRadius: "50%",
            background: "#ef4444", fontSize: 10, fontWeight: 700, color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid white",
          }}>{unread}</div>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 86, right: 24, zIndex: 99998,
          width: 360, height: 520,
          background: "#0f172a",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "chatSlideUp 0.25s ease both",
          fontFamily: "'Be Vietnam Pro', sans-serif",
        }}>

          {/* Header */}
          <div style={{
            padding: "13px 16px",
            background: "linear-gradient(135deg,rgba(37,99,235,0.25),rgba(124,58,237,0.18))",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg,#2563eb,#7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot size={17} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>ScrollTutor AI</div>
              <div style={{ fontSize: 11, color: "#4ade80", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                Sẵn sàng hỗ trợ
              </div>
            </div>
            {messages.length > 0 && (
              <button className="icon-btn" onClick={() => { setMessages([]); setError(""); }}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#475569", padding:4, display:"flex" }}>
                <Trash2 size={15} />
              </button>
            )}
            <button className="icon-btn" onClick={() => setOpen(false)}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#475569", padding:4, display:"flex" }}>
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages area */}
          <div className="chat-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: "linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.15))",
                  border: "1px solid rgba(96,165,250,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px",
                }}>
                  <Bot size={24} color="#60a5fa" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 6 }}>
                  Xin chào! Tôi là AI của ScrollTutor
                </div>
                <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.6, marginBottom: 18, padding: "0 8px" }}>
                  Hỏi tôi về code, lỗi, hay bất cứ điều gì bạn đang gặp khó khăn!
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="chip-btn" onClick={() => sendMessage(s)} style={{
                      padding: "6px 11px", borderRadius: 20, fontSize: 12,
                      background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.25)",
                      color: "#93c5fd", cursor: "pointer", transition: "all 0.2s",
                      fontFamily: "'Be Vietnam Pro',sans-serif",
                    }}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

            {loading && (
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, marginBottom:12 }}>
                <div style={{
                  width:28, height:28, borderRadius:"50%", flexShrink:0,
                  background:"linear-gradient(135deg,#2563eb,#7c3aed)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <Bot size={14} color="white" />
                </div>
                <div style={{
                  padding:"10px 14px", borderRadius:"18px 18px 18px 4px",
                  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.08)",
                }}>
                  <TypingDots />
                </div>
              </div>
            )}

            {error && (
              <div style={{
                margin:"8px 0", padding:"10px 14px", borderRadius:12,
                background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
                color:"#fca5a5", fontSize:13,
              }}>⚠️ {error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:"11px 13px", borderTop:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)" }}>
            <div style={{
              display:"flex", gap:8, alignItems:"flex-end",
              background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:14, padding:"8px 8px 8px 13px",
            }}>
              <textarea
                ref={inputRef}
                className="chat-textarea"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi gì đó... (Enter để gửi)"
                rows={1}
                style={{
                  flex:1, background:"none", border:"none", color:"#e2e8f0",
                  fontSize:13.5, resize:"none", fontFamily:"'Be Vietnam Pro',sans-serif",
                  lineHeight:1.5, maxHeight:100, overflowY:"auto", paddingTop:2,
                }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 100) + "px";
                }}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                style={{
                  width:34, height:34, borderRadius:10, border:"none",
                  background:"#2563eb", color:"white", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0, transition:"background 0.2s",
                }}
              >
                {loading ? <Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} /> : <Send size={15} />}
              </button>
            </div>
            <div style={{ textAlign:"center", marginTop:7, fontSize:11, color:"#1e3a5f" }}>
              Shift+Enter để xuống dòng
            </div>
          </div>
        </div>
      )}
    </>
  );
}
