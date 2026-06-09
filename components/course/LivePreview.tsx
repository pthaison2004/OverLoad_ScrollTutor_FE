"use client";
import { useEffect, useRef } from "react";

interface Props {
  code: string;
  language: string;
  runKey: number;
}

function buildHtml(code: string, language: string): string {
  if (language === "css") {
    return `<!DOCTYPE html>
<html>
<head>
<style>
body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc; font-family: sans-serif; }
${code}
</style>
</head>
<body>
  <div class="box"></div>
</body>
</html>`;
  }

  if (language === "javascript") {
    return `<!DOCTYPE html>
<html>
<head>
<style>
body { margin: 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px; background: #0f172a; color: #4ade80; }
#output { white-space: pre-wrap; }
</style>
</head>
<body>
<div id="output"></div>
<script>
const originalLog = console.log;
const out = document.getElementById('output');
console.log = (...args) => {
  out.textContent += args.join(' ') + '\\n';
  originalLog(...args);
};
try {
${code}
} catch(e) {
  out.textContent += '\\n❌ ' + e.message;
}
</script>
</body>
</html>`;
  }

  // HTML mode
  return `<!DOCTYPE html>
<html>
<head>
<style>body { margin: 16px; font-family: sans-serif; }</style>
</head>
<body>
${code}
</body>
</html>`;
}

export default function LivePreview({ code, language, runKey }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    const html = buildHtml(code, language);
    const iframe = iframeRef.current;
    iframe.srcdoc = html;
  }, [runKey, code, language]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0"
      sandbox="allow-scripts"
      title="Live Preview"
    />
  );
}
