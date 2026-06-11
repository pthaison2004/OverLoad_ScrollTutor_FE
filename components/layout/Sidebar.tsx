"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Layout, Server, Database, BookOpen, Wallet } from "lucide-react";

const categoryItems = [
  { value: "frontend", label: "Front-end", icon: Layout },
  { value: "backend", label: "Back-end", icon: Server },
  { value: "database", label: "Database", icon: Database },
];

const navItems = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/courses", label: "Khóa của tôi", icon: BookOpen },
  { href: "/deposit", label: "Nạp tiền", icon: Wallet },
];

type SidebarProps = {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
  onHomeClick?: () => void;
};

export default function Sidebar({ activeCategory, onCategoryChange, onHomeClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleHomeClick = () => {
    onHomeClick?.();
    router.push("/");
  };

  const handleCategoryClick = (category: string) => {
    if (onCategoryChange) {
      onCategoryChange(category);
    } else {
      // If not on the homepage (like /deposit or /courses), redirect to "/" with "?category=..."
      router.push(`/?category=${category}`);
    }
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-10 h-10 flex items-center justify-center">
          <img src="/logo.png" alt="ScrollTutor" className="w-9 h-9 object-contain" />
        </div>
      </div>

      {/* Global Navigation Section (Trang chủ, Khóa của tôi, Nạp tiền) */}
      <div className="space-y-2 mb-4">
        {navItems.map(({ href, label, icon: Icon }) =>
          href === "/" ? (
            <button
              key={href}
              type="button"
              onClick={handleHomeClick}
              className={`sidebar-item w-full justify-start ${pathname === href ? "active" : ""}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ) : (
            <Link
              key={href}
              href={href}
              className={`sidebar-item ${pathname === href ? "active" : ""}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          )
        )}
      </div>

      <div className="w-8 h-px bg-slate-200 mb-4 mx-auto" />

      {/* Category Filter Section (Front-end, Back-end, Database) */}
      <div className="space-y-2">
        {categoryItems.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => handleCategoryClick(item.value)}
            className={`sidebar-item w-full justify-start ${
              activeCategory === item.value ? "active" : ""
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
