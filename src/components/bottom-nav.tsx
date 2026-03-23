"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  CheckSquare,
  ShoppingCart,
  Calendar,
  BarChart3,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ראשי", icon: Home },
  { href: "/tasks", label: "משימות", icon: CheckSquare },
  { href: "/shopping", label: "קניות", icon: ShoppingCart },
  { href: "/weekly", label: "שבועי", icon: Calendar },
  { href: "/stats", label: "סטטיסטיקה", icon: BarChart3 },
  { href: "/settings", label: "הגדרות", icon: Settings },
] as const;

const SPRING_TRANSITION = { type: "spring" as const, stiffness: 500, damping: 32 };

const NavItem = memo(function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all relative ${
        isActive
          ? "text-primary"
          : "text-muted hover:text-foreground"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="nav-active"
          className="absolute inset-0 bg-primary/[0.06] rounded-xl"
          transition={SPRING_TRANSITION}
        >
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full gradient-primary" />
        </motion.div>
      )}
      <Icon
        className={`w-[20px] h-[20px] relative z-10 transition-transform duration-200 ${
          isActive ? "scale-110" : ""
        }`}
        strokeWidth={isActive ? 2.5 : 1.8}
      />
      <span
        className={`text-[9px] relative z-10 leading-tight ${
          isActive ? "font-bold" : "font-medium opacity-80"
        }`}
      >
        {label}
      </span>
    </Link>
  );
});

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-30">
      <div className="glass-nav rounded-2xl max-w-lg mx-auto">
        <div className="flex items-center justify-around h-[60px] px-1">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname === item.href}
            />
          ))}
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}
