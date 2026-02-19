"use client";

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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors relative ${
                isActive
                  ? "text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full"
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}
