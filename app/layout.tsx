import type { Metadata } from "next";
import "./globals.css";
import AIChatBox from "../components/chat/AIChatBox";

export const metadata: Metadata = {
  title: "ScrollTutor - Học lập trình online",
  description: "Nền tảng học lập trình trực tuyến hàng đầu Việt Nam",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <AIChatBox />
      </body>
    </html>
  );
}
