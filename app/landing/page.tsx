"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ─── tiny hook: IntersectionObserver reveal ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── data ─── */
const FEATURES = [
  {
    icon: "⚡",
    title: "Code → UI ngay lập tức",
    desc: "Mỗi dòng code bạn viết hiện ra kết quả trực tiếp bên cạnh. Không cần cài đặt, không cần chờ đợi — học ngay trên trình duyệt.",
    color: "#f97316",
  },
  {
    icon: "🗺️",
    title: "Lộ trình từng bước rõ ràng",
    desc: "Từ HTML đầu tiên đến project thực tế. Mỗi bài học được thiết kế theo kiểu scroll-based — cuộn tới đâu, hiểu tới đó.",
    color: "#2563eb",
  },
  {
    icon: "🎓",
    title: "Miễn phí cho người mới",
    desc: "Toàn bộ khóa cơ bản hoàn toàn miễn phí. Bắt đầu học ngay hôm nay, không cần thẻ tín dụng.",
    color: "#10b981",
  },
  {
    icon: "🤖",
    title: "AI hỗ trợ 24/7",
    desc: "Bị lỗi không biết sửa? AI giải thích từng lỗi, gợi ý bài tiếp theo và cá nhân hoá lộ trình học cho riêng bạn.",
    color: "#8b5cf6",
  },
  {
    icon: "🌐",
    title: "Học mọi lúc, mọi nơi",
    desc: "Chạy hoàn toàn trên trình duyệt. Điện thoại, máy tính bảng hay laptop — mở ra là học được ngay.",
    color: "#ec4899",
  },
];

const COURSES_PREVIEW = [
  { title: "HTML & CSS cơ bản", tag: "Miễn phí", color: "from-orange-400 to-red-500", icon: "</>", lessons: 28 },
  { title: "JavaScript cơ bản", tag: "Miễn phí", color: "from-yellow-400 to-orange-400", icon: "JS", lessons: 35 },
  { title: "ReactJS", tag: "Miễn phí", color: "from-cyan-400 to-blue-500", icon: "⚛", lessons: 42 },
  { title: "NodeJS", tag: "Miễn phí", color: "from-green-500 to-emerald-600", icon: "▲", lessons: 30 },
  { title: "HTML & CSS Nâng cao", tag: "Pro", color: "from-blue-600 to-indigo-700", icon: "CSS3", lessons: 50 },
  { title: "JavaScript Nâng cao", tag: "Pro", color: "from-amber-500 to-orange-600", icon: "JS+", lessons: 60 },
];

const TESTIMONIALS = [
  {
    name: "Nguyễn Minh Khôi",
    role: "Sinh viên năm 2, HCMUTE",
    avatar: "K",
    avatarColor: "#2563eb",
    text: "Trước đây mình học trên YouTube xong không nhớ gì cả. ScrollTutor khác hẳn — vừa đọc lý thuyết vừa code luôn, kết quả hiện ra ngay nên mình nhớ rất lâu!",
    stars: 5,
  },
  {
    name: "Trần Thị Hồng Nhung",
    role: "Freelancer, 25 tuổi",
    avatar: "N",
    avatarColor: "#10b981",
    text: "Mình đã từng bỏ cuộc 2 lần khi học code vì quá khô khan. Với ScrollTutor, cái cảm giác thấy kết quả ngay khi code là động lực cực kỳ lớn để mình tiếp tục.",
    stars: 5,
  },
  {
    name: "Lê Quốc Bảo",
    role: "Nhân viên văn phòng chuyển ngành",
    avatar: "B",
    avatarColor: "#f97316",
    text: "Mình 28 tuổi mới bắt đầu học lập trình. Tưởng sẽ khó lắm nhưng ScrollTutor giải thích rất dễ hiểu. AI support còn giúp mình sửa lỗi nhanh hơn nhiều.",
    stars: 5,
  },
];

const FAQS = [
  {
    q: "Tôi không có nền tảng lập trình, có học được không?",
    a: "Hoàn toàn được! ScrollTutor được thiết kế dành riêng cho người mới bắt đầu từ zero. Các khóa học bắt đầu từ những khái niệm cơ bản nhất và tăng dần theo lộ trình rõ ràng.",
  },
  {
    q: "\"Code → UI\" experience là gì?",
    a: "Đây là cách học đặc trưng của ScrollTutor: mỗi khi bạn viết hoặc chỉnh sửa code, giao diện kết quả hiện ra ngay lập tức ở bên cạnh. Bạn thấy được ngay mỗi dòng code tạo ra điều gì — không cần đoán, không cần chạy file riêng.",
  },
  {
    q: "Gói Pro có những gì khác gói Free?",
    a: "Gói Free cho bạn học toàn bộ khóa cơ bản (HTML, CSS, JS, React, NodeJS). Gói Pro (69.000đ/tháng) mở khóa các khóa nâng cao, AI hỗ trợ debug & giải thích lỗi, lộ trình học cá nhân hoá và phản hồi code từ mentor.",
  },
  {
    q: "Tôi có thể học trên điện thoại không?",
    a: "Có! ScrollTutor chạy hoàn toàn trên trình duyệt, không cần cài đặt gì. Bạn có thể học trên điện thoại, máy tính bảng hoặc laptop tuỳ thích.",
  },
  {
    q: "Sau khi học xong tôi có làm được việc không?",
    a: "Sau khi hoàn thành lộ trình, bạn sẽ tự xây dựng được một project thực tế và nhận phản hồi chi tiết về code. Đây là nền tảng vững chắc để bắt đầu con đường Frontend Developer.",
  },
];

/* ─── Component ─── */
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif", background: "#060b18", color: "#f1f5f9", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        .grad-text {
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .grad-text-orange {
          background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .card-glass {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          backdrop-filter: blur(12px);
          transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
        }
        .card-glass:hover {
          transform: translateY(-4px);
          border-color: rgba(96,165,250,0.3);
          box-shadow: 0 20px 60px rgba(96,165,250,0.08);
        }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 32px; border-radius: 14px; border: none; cursor: pointer;
          font-family: 'Be Vietnam Pro', sans-serif;
          font-weight: 700; font-size: 15px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: white;
          box-shadow: 0 4px 24px rgba(37,99,235,0.4);
          transition: transform 0.2s, box-shadow 0.2s;
          text-decoration: none;
          white-space: nowrap;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(37,99,235,0.55);
        }
        .btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px; border-radius: 14px; cursor: pointer;
          font-family: 'Be Vietnam Pro', sans-serif;
          font-weight: 600; font-size: 15px;
          background: transparent;
          border: 1.5px solid rgba(255,255,255,0.2);
          color: #e2e8f0;
          transition: border-color 0.2s, background 0.2s;
          text-decoration: none;
          white-space: nowrap;
        }
        .btn-outline:hover {
          border-color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.05);
        }

        .noise {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        .star { color: #fbbf24; font-size: 14px; }

        .faq-item { border-bottom: 1px solid rgba(255,255,255,0.07); }
        .faq-btn {
          width: 100%; text-align: left; background: none; border: none; cursor: pointer;
          padding: 22px 0; display: flex; justify-content: space-between; align-items: center;
          font-family: 'Be Vietnam Pro', sans-serif; font-size: 16px; font-weight: 600; color: #f1f5f9;
        }
        .faq-answer {
          overflow: hidden; transition: max-height 0.35s ease, opacity 0.35s ease;
          color: #94a3b8; font-size: 15px; line-height: 1.7;
        }

        .mesh {
          position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none;
        }

        section { position: relative; }
        @media (max-width: 768px) {
          .hero-title { font-size: 2.4rem !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .courses-grid { grid-template-columns: 1fr 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Noise overlay */}
      <div className="noise" />

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 5%",
        height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(6,11,24,0.9)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        transition: "all 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 40 40" width="20" height="20">
              <path d="M20 4 L34 12 L34 28 L20 36 L6 28 L6 12 Z" fill="none" stroke="white" strokeWidth="3"/>
              <path d="M14 16 Q20 10 26 16 Q20 22 14 16Z" fill="white"/>
              <path d="M14 24 Q20 18 26 24 Q20 30 14 24Z" fill="rgba(255,255,255,0.6)"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px" }}>ScrollTutor</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/login" className="btn-outline" style={{ padding: "9px 20px", fontSize: 14 }}>Đăng nhập</Link>
          <Link href="/register" className="btn-primary" style={{ padding: "9px 20px", fontSize: 14 }}>Bắt đầu miễn phí</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 5% 80px", textAlign: "center", position: "relative" }}>
        {/* Mesh blobs */}
        <div className="mesh" style={{ width: 500, height: 500, background: "rgba(37,99,235,0.18)", top: "5%", left: "-10%" }} />
        <div className="mesh" style={{ width: 400, height: 400, background: "rgba(124,58,237,0.15)", top: "20%", right: "-8%" }} />
        <div className="mesh" style={{ width: 300, height: 300, background: "rgba(236,72,153,0.1)", bottom: "10%", left: "30%" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto" }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 100,
            background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)",
            fontSize: 13, fontWeight: 600, color: "#93c5fd", marginBottom: 32,
            animation: "fadeIn 0.6s ease both",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#60a5fa", display: "inline-block" }} />
            Nền tảng học lập trình #1 cho người mới
          </div>

          <h1 className="hero-title" style={{ fontSize: "3.6rem", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 24 }}>
            Học code và thấy kết quả{" "}
            <span className="grad-text">ngay lập tức</span>
            <br />— không cần cài đặt gì
          </h1>

          <p style={{ fontSize: "1.15rem", color: "#94a3b8", lineHeight: 1.7, maxWidth: 580, margin: "0 auto 40px", fontWeight: 400 }}>
            ScrollTutor mang đến trải nghiệm học <strong style={{ color: "#e2e8f0" }}>Code → UI 1:1</strong> — viết một dòng code,
            giao diện thay đổi ngay trước mắt bạn. Dành cho người mới bắt đầu từ zero.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="btn-primary" style={{ fontSize: 16, padding: "15px 36px" }}>
              🚀 Bắt đầu học miễn phí
            </Link>
            <Link href="/" className="btn-outline" style={{ fontSize: 16, padding: "15px 36px" }}>
              Xem khóa học →
            </Link>
          </div>

          {/* Social proof */}
          <div style={{ marginTop: 52, display: "flex", justifyContent: "center", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
            {[
              { num: "10,000+", label: "Học viên" },
              { num: "4.9★", label: "Đánh giá trung bình" },
              { num: "100%", label: "Miễn phí để bắt đầu" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9" }}>{s.num}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CODE → UI DEMO ── */}
      <section style={{ padding: "80px 5%", background: "rgba(255,255,255,0.02)" }}>
        <Reveal>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 12 }}>
                Trải nghiệm <span className="grad-text-orange">Code → UI</span>
              </h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>Viết code bên trái, kết quả hiện ra ngay bên phải</p>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
              borderRadius: 16, overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
            }}>
              {/* Editor side */}
              <div style={{ background: "#1e2433", padding: "0" }}>
                <div style={{ background: "#161b2e", padding: "12px 16px", display: "flex", gap: 6, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ marginLeft: 8, fontSize: 11, color: "#475569" }}>style.css</span>
                </div>
                <pre style={{ padding: "20px", fontSize: 13, lineHeight: 1.8, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", overflowX: "auto" }}>{`.box {
  width: 200px;
  height: 200px;
  `}<span style={{ color: "#60a5fa" }}>background</span>{`: `}<span style={{ color: "#f472b6" }}>coral</span>{`;
  `}<span style={{ color: "#60a5fa" }}>border-radius</span>{`: `}<span style={{ color: "#fb923c" }}>16px</span>{`;
  `}<span style={{ color: "#60a5fa" }}>box-shadow</span>{`:
    0 8px 32px `}<span style={{ color: "#f472b6" }}>rgba</span>{`(0,0,0,0.2);
}`}</pre>
              </div>

              {/* Preview side */}
              <div style={{ background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
                <div style={{
                  width: 120, height: 120,
                  background: "coral",
                  borderRadius: 16,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: "100px 5%" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ color: "#60a5fa", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Tại sao chọn ScrollTutor</p>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
              Học theo cách mà não bạn<br /><span className="grad-text">thực sự ghi nhớ</span>
            </h2>
          </div>
        </Reveal>

        <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 1100, margin: "0 auto" }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <div className="card-glass" style={{ padding: "28px 24px" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${f.color}18`, border: `1px solid ${f.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, marginBottom: 16,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: "#f1f5f9" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── COURSES ── */}
      <section style={{ padding: "100px 5%", background: "rgba(255,255,255,0.02)" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: "#60a5fa", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Khóa học</p>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
              Từ zero đến <span className="grad-text">Frontend Developer</span>
            </h2>
            <p style={{ color: "#64748b", fontSize: 15, marginTop: 12 }}>Lộ trình được thiết kế để bạn build project thực tế ngay sau khi hoàn thành</p>
          </div>
        </Reveal>

        <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, maxWidth: 1100, margin: "0 auto 40px" }}>
          {COURSES_PREVIEW.map((c, i) => (
            <Reveal key={c.title} delay={i * 60}>
              <div className="card-glass" style={{ overflow: "hidden" }}>
                <div style={{ height: 120, background: `linear-gradient(135deg, ${c.color.replace("from-", "").replace(" to-", ", ")})`, position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 12 }}>
                  <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }} className={`bg-gradient-to-br ${c.color}`} />
                  <div style={{ position: "absolute", top: 12, left: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{c.title}</div>
                  </div>
                  <span style={{ fontSize: 28, fontWeight: 900, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>{c.icon}</span>
                  <div className={`absolute inset-0 bg-gradient-to-br ${c.color}`} style={{ position: "absolute", inset: 0 }} />
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{c.lessons} bài học</span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                      background: c.tag === "Miễn phí" ? "rgba(34,197,94,0.15)" : "rgba(124,58,237,0.15)",
                      color: c.tag === "Miễn phí" ? "#4ade80" : "#a78bfa",
                      border: `1px solid ${c.tag === "Miễn phí" ? "rgba(34,197,94,0.3)" : "rgba(124,58,237,0.3)"}`,
                    }}>{c.tag}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div style={{ textAlign: "center" }}>
            <Link href="/" className="btn-outline">Xem tất cả khóa học →</Link>
          </div>
        </Reveal>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: "100px 5%" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: "#60a5fa", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Bảng giá</p>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
              Bắt đầu <span className="grad-text">miễn phí</span>, nâng cấp khi sẵn sàng
            </h2>
          </div>
        </Reveal>

        <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 760, margin: "0 auto" }}>
          {/* Free */}
          <Reveal delay={0}>
            <div className="card-glass" style={{ padding: "36px 32px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Free</div>
              <div style={{ fontSize: "2.8rem", fontWeight: 900, color: "#f1f5f9", marginBottom: 4 }}>0₫</div>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 28 }}>Mãi mãi miễn phí</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                {["Toàn bộ khóa học cơ bản", "Live code editor", "Lộ trình học rõ ràng", "Cộng đồng học viên"].map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "#94a3b8" }}>
                    <span style={{ color: "#4ade80", fontSize: 16 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <Link href="/register" className="btn-outline" style={{ width: "100%", justifyContent: "center" }}>Bắt đầu ngay</Link>
            </div>
          </Reveal>

          {/* Pro */}
          <Reveal delay={100}>
            <div style={{
              padding: "36px 32px", borderRadius: 20,
              background: "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))",
              border: "1px solid rgba(96,165,250,0.3)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 16, right: 16, background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>PHỔ BIẾN</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: "2.8rem", fontWeight: 900, color: "#f1f5f9" }}>69.000₫</span>
              </div>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 28 }}>mỗi tháng</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                {["Tất cả tính năng Free", "Khóa học nâng cao & project thực tế", "AI hỗ trợ debug & giải thích lỗi", "Lộ trình học cá nhân hoá", "Phản hồi code chi tiết"].map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "#cbd5e1" }}>
                    <span style={{ color: "#60a5fa", fontSize: 16 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <Link href="/register" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>Nâng cấp Pro</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "100px 5%", background: "rgba(255,255,255,0.02)" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: "#60a5fa", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Học viên nói gì</p>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
              Họ đã <span className="grad-text">không bỏ cuộc</span> nữa
            </h2>
          </div>
        </Reveal>

        <div className="testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 1100, margin: "0 auto" }}>
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <div className="card-glass" style={{ padding: "28px 24px" }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                  {[...Array(t.stars)].map((_, i) => <span key={i} className="star">★</span>)}
                </div>
                <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, marginBottom: 20 }}>"{t.text}"</p>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: t.avatarColor, display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 700, fontSize: 16, color: "white",
                    flexShrink: 0,
                  }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "100px 5%" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ color: "#60a5fa", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>FAQ</p>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
              Câu hỏi <span className="grad-text">thường gặp</span>
            </h2>
          </div>
        </Reveal>

        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {FAQS.map((faq, i) => (
            <Reveal key={i} delay={i * 50}>
              <div className="faq-item">
                <button className="faq-btn" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <span style={{
                    fontSize: 20, color: "#475569",
                    transform: openFaq === i ? "rotate(45deg)" : "rotate(0)",
                    transition: "transform 0.3s", display: "inline-block", flexShrink: 0,
                  }}>+</span>
                </button>
                <div className="faq-answer" style={{
                  maxHeight: openFaq === i ? 200 : 0,
                  opacity: openFaq === i ? 1 : 0,
                  paddingBottom: openFaq === i ? 20 : 0,
                }}>
                  {faq.a}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "100px 5%", textAlign: "center", position: "relative" }}>
        <div className="mesh" style={{ width: 600, height: 400, background: "rgba(37,99,235,0.12)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
        <Reveal>
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ fontSize: "2.8rem", fontWeight: 900, letterSpacing: "-1px", marginBottom: 16, lineHeight: 1.2 }}>
              Sẵn sàng viết dòng code<br /><span className="grad-text">đầu tiên của bạn?</span>
            </h2>
            <p style={{ color: "#64748b", fontSize: 16, marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
              Tham gia cùng 10,000+ học viên đang học lập trình theo cách thú vị nhất — hoàn toàn miễn phí để bắt đầu.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" className="btn-primary" style={{ fontSize: 16, padding: "16px 40px" }}>
                🚀 Bắt đầu miễn phí ngay
              </Link>
              <Link href="/" className="btn-outline" style={{ fontSize: 16, padding: "16px 32px" }}>
                Xem khóa học
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 40 40" width="16" height="16">
              <path d="M20 4 L34 12 L34 28 L20 36 L6 28 L6 12 Z" fill="none" stroke="white" strokeWidth="3.5"/>
              <path d="M14 16 Q20 10 26 16 Q20 22 14 16Z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, color: "#64748b", fontSize: 14 }}>ScrollTutor © 2026</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Điều khoản", "Bảo mật", "Liên hệ"].map(l => (
            <a key={l} href="#" style={{ fontSize: 13, color: "#475569", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
              onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
            >{l}</a>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: translateY(16px) } to { opacity:1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
