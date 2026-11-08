"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { Home, CheckSquare, ShoppingCart, UtensilsCrossed, MoreHorizontal } from "lucide-react";

const items = [
  { href: "/dashboard", label: "היום", en: "Today", icon: Home },
  { href: "/tasks", label: "משימות", en: "Tasks", icon: CheckSquare },
  { href: "/shopping", label: "קניות", en: "Shopping", icon: ShoppingCart },
  { href: "/meals", label: "ארוחות", en: "Meals", icon: UtensilsCrossed },
  { href: "/more", label: "עוד", en: "More", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();
  const { locale } = useTranslation();
  const secondary = ["/more", "/weekly", "/stats", "/settings", "/history", "/emergency", "/playlists"];
  return <nav aria-label={locale === "en" ? "Main navigation" : "ניווט ראשי"} className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-1 pb-[env(safe-area-inset-bottom)] shadow-lg lg:inset-y-0 lg:right-0 lg:left-auto lg:w-56 lg:border-t-0 lg:border-l lg:px-4 lg:pt-8">
    <div className="hidden px-3 pb-8 text-xl font-bold lg:block">בית בסדר</div>
    <div className="flex justify-around lg:flex-col lg:gap-1">
      {items.map(({ href, label, en, icon: Icon }) => {
        const active = href === "/more" ? secondary.some(path => pathname === path || pathname.startsWith(path + "/")) : pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm ${active ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-hover"}`}><Icon className="size-5" aria-hidden="true"/><span>{locale === "en" ? en : label}</span></Link>;
      })}
    </div>
  </nav>;
}
