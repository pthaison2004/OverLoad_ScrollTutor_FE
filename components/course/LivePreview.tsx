"use client";
import { useEffect, useRef } from "react";

interface Props {
  code: string;
  language: string;
  runKey: number;
}

function isActuallyHtml(code: string): boolean {
  const trimmed = code.trim();
  // Code starts with an HTML tag and has no JS-specific syntax
  if (!trimmed.startsWith("<")) return false;
  const hasJsSyntax = /^(const|let|var|function)\s/m.test(trimmed) ||
    trimmed.includes("console.log") ||
    trimmed.includes("useState") ||
    trimmed.includes("import ");
  return !hasJsSyntax;
}

function buildHtml(rawCode: string, language: string): string {
  const code = rawCode.trim();

  // CSS Mode - Demo Box (.box/.card) for box model, rounded corners, colors, plus Navbar, Grid & Selectors
  if (language === "css") {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; }
body { margin: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; line-height: 1.5; }

/* Default base fallback styles so elements look good before custom CSS */
.box, .card {
  width: 100%;
  max-width: 360px;
  padding: 20px;
  background-color: #3b82f6;
  color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin: 8px 0;
  transition: all 0.2s ease;
}

${code}
</style>
</head>
<body>
  <!-- Prominent Demo Box Section for Box Model, Border Radius, Padding & Colors -->
  <div style="margin-bottom: 16px;">
    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
      📦 Demo Box (.box / .card):
    </div>
    <div class="box card">
      <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 16px;">Demo Box Element</h3>
      <p style="margin: 0; font-size: 13px; opacity: 0.95;">Thử nghiệm đổi <code>background-color</code>, <code>border-radius</code>, <code>padding</code>, <code>color</code>, <code>margin</code> cho .box hoặc .card</p>
    </div>
  </div>

  <!-- Navbar Pattern for Flexbox/Header Lessons -->
  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 12px; margin-bottom: 6px;">
    🌐 Navbar (.navbar):
  </div>
  <nav class="navbar header-nav nav" style="margin-bottom: 16px;">
    <div class="logo">OverLoad Logo</div>
    <ul class="nav-links menu">
      <li><a href="#">Trang chủ</a></li>
      <li><a href="#">Khóa học</a></li>
      <li><a href="#">Liên hệ</a></li>
    </ul>
  </nav>

  <!-- Heading & Text Pattern -->
  <h1 id="main-title">Tiêu đề chính (#main-title)</h1>
  <p class="highlight">Đoạn văn có class <code>.highlight</code></p>

  <!-- Flexbox & Grid Layout Pattern -->
  <div class="grid-container layout flex-container row" style="margin-top: 12px;">
    <header class="header">Header</header>
    <div class="wrapper" style="display: flex; gap: 12px; width: 100%; margin: 8px 0;">
      <aside class="sidebar" style="min-width: 80px; padding: 8px; background: #e2e8f0; border-radius: 6px;">Sidebar</aside>
      <main class="main-content content" style="flex: 1;">
        <div class="container box-wrapper">
          <div class="item col" style="padding: 10px; background: #cbd5e1; border-radius: 6px;">Item 1</div>
          <div class="item col" style="padding: 10px; background: #cbd5e1; border-radius: 6px; margin-top: 4px;">Item 2</div>
        </div>
      </main>
    </div>
    <footer class="footer">Footer</footer>
  </div>

  <!-- Form & Interactive Elements Pattern -->
  <div style="margin-top: 16px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
    <a href="#">Link mẫu (a:hover)</a>
    <input type="email" class="input" placeholder="email@example.com" />
    <button class="btn btn-primary">Button</button>
    <span class="badge">Badge</span>
  </div>
</body>
</html>`;
  }

  // HTML Mode (explicit or auto-detected from code content)
  if (language === "html" || isActuallyHtml(code)) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; }
body { margin: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; }
.card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-top: 8px; }
.card h2 { margin-top: 0; color: #2563eb; font-size: 18px; }
.card p { margin-bottom: 0; color: #64748b; font-size: 14px; }
</style>
</head>
<body>
${code}
</body>
</html>`;
  }

  // JavaScript Mode: Strip module imports, then execute natively
  let cleanCode = code
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm, "")
    .replace(/^import\s+['"][^'"]+['"];?/gm, "")
    .trim();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; }
body { margin: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #0f172a; }
#console-log { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #4ade80; white-space: pre-wrap; background: #0f172a; padding: 12px; border-radius: 8px; margin-bottom: 12px; display: none; }
.card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-top: 8px; }
.card h2 { margin-top: 0; color: #2563eb; font-size: 18px; }
.card p { margin-bottom: 0; color: #64748b; font-size: 14px; }
button { padding: 8px 16px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f1f5f9; font-size: 13px; font-weight: 600; cursor: pointer; margin-right: 8px; margin-top: 8px; transition: all 0.15s; color: #1e293b; }
button:hover { background: #e2e8f0; border-color: #94a3b8; }
.error-box { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; font-size: 13px; font-family: monospace; }
.inspector-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px; margin-top: 4px; }
.inspector-title { font-weight: 700; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
.var-row { padding: 4px 0; border-bottom: 1px dashed #e2e8f0; word-break: break-all; }
.var-row:last-child { border-bottom: none; }
.var-name { color: #2563eb; font-weight: 700; }
.var-val { color: #059669; font-weight: 600; }
</style>
</head>
<body>
  <div id="console-log"></div>
  <div id="root"></div>

  <script>
    (function() {
      var logBox = document.getElementById('console-log');
      var root = document.getElementById('root');

      var originalLog = console.log;
      console.log = function() {
        var args = Array.prototype.slice.call(arguments);
        logBox.style.display = 'block';
        logBox.textContent += args.map(function(a) { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }).join(' ') + '\\n';
        originalLog.apply(console, args);
      };

      function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }

      try {
        var codeToRun = ${JSON.stringify(cleanCode)};

        // Execute user code natively
        var evalRes = (0, eval)(codeToRun);

        // Collect all declared variables (const/let/var)
        var matches = codeToRun.match(/(?:const|let|var)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g) || [];
        var varNames = [];
        for (var i = 0; i < matches.length; i++) {
          var name = matches[i].replace(/^(?:const|let|var)\\s+/, '');
          if (varNames.indexOf(name) === -1) varNames.push(name);
        }

        var varOutputs = [];
        var hasRenderedHtml = false;

        for (var j = 0; j < varNames.length; j++) {
          try {
            var val = (0, eval)(varNames[j]);
            if (val !== undefined) {
              if (typeof val === 'string' && val.indexOf('<') !== -1 && val.indexOf('>') !== -1) {
                root.innerHTML += val;
                hasRenderedHtml = true;
              } else {
                var valStr = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
                varOutputs.push('<div class="var-row"><span class="var-name">' + varNames[j] + '</span> = <span class="var-val">' + escapeHtml(valStr) + '</span></div>');
              }
            }
          } catch(e) {}
        }

        if (!hasRenderedHtml && !logBox.textContent.trim()) {
          if (varOutputs.length > 0) {
            root.innerHTML = '<div class="inspector-box"><div class="inspector-title">📊 KẾT QUẢ BIẾN (INSPECTOR OUTPUT):</div>' + varOutputs.join('') + '</div>';
          } else if (evalRes !== undefined) {
            var resStr = typeof evalRes === 'object' ? JSON.stringify(evalRes, null, 2) : String(evalRes);
            root.innerHTML = '<div class="inspector-box"><div class="inspector-title">📊 KẾT QUẢ:</div><div class="var-row">' + escapeHtml(resStr) + '</div></div>';
          }
        }
      } catch(err) {
        root.innerHTML = '<div class="error-box">❌ Lỗi: ' + escapeHtml(err.message) + '</div>';
      }
    })();
  </script>
</body>
</html>`;
}

export default function LivePreview({ code, language, runKey }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    const html = buildHtml(code, language);
    iframeRef.current.srcdoc = html;
  }, [runKey, code, language]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin"
      title="Live Preview"
    />
  );
}
