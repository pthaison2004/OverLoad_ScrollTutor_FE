import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isLoggedIn,
  clearAuth,
  setLastActivity,
  getLastActivity,
  clearLastActivity,
} from "@/lib/auth";

// Thời gian không hoạt động tối đa trước khi tự đăng xuất (15 phút)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

// Các sự kiện coi là người dùng đang hoạt động
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

export function useInactivityLogout() {
  const router = useRouter();
  const [isExpired, setIsExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    clearAuth();
    clearLastActivity();
    setIsExpired(false);
    router.replace("/landing");
  }, [router]);

  const handleExpiry = useCallback(() => {
    setIsExpired(true);
  }, []);

  const resetTimer = useCallback(() => {
    if (isExpired) return; // Không đặt lại timer nếu đã hết hạn

    setLastActivity();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleExpiry, INACTIVITY_TIMEOUT_MS);
  }, [isExpired, handleExpiry]);

  useEffect(() => {
    // Không làm gì nếu chưa đăng nhập
    if (!isLoggedIn()) return;

    // Kiểm tra ngay khi component mount: nếu đã quá thời gian inactive thì logout luôn
    const lastActivity = getLastActivity();
    if (lastActivity !== null) {
      const elapsed = Date.now() - lastActivity;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        logout();
        return;
      }
    }

    resetTimer();

    // Theo dõi hoạt động của người dùng
    const handleActivity = () => {
      if (isExpired) {
        // Nếu đã hết hạn mà người dùng quay lại bấm bất kỳ đâu/bất kỳ phím nào -> Logout ngay lập tức
        logout();
      } else {
        resetTimer();
      }
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );

    // Lắng nghe storage event để đồng bộ logout giữa các tab
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ol_access_token" && !e.newValue) {
        router.replace("/landing");
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [logout, resetTimer, isExpired, router]);

  return { isExpired, logout };
}
