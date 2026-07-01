import type { Metadata } from "next";
import "./globals.css";
import AIChatBox from "../components/chat/AIChatBox";
import InactivityGuard from "../components/auth/InactivityGuard";

export const metadata: Metadata = {
  title: "ScrollTutor - Học lập trình online",
  description: "Nền tảng học lập trình trực tuyến hàng đầu Việt Nam",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <AIChatBox />
        <InactivityGuard />
      </body>
    </html>
  );
}

