"use client";

import Image from "next/image";
import Link from "next/link";

interface DashboardHeaderProps {
  displayName: string;
  greeting: string;
  subtitle: string;
  hebrewDate: string;
  avatarUrl?: string | null;
  completedCount: number;
  totalCount: number;
}

export function DashboardHeader({
  displayName,
  greeting,
  subtitle,
  hebrewDate,
  avatarUrl,
  completedCount,
  totalCount,
}: DashboardHeaderProps) {
  return (
    <div className="relative gradient-hero mesh-overlay rounded-b-[2rem] px-4 pt-6 pb-10 -mx-0 overflow-hidden">
      {/* App name - links to landing page */}
      <Link href="/" className="absolute top-4 right-4 z-10 text-white/50 hover:text-white/80 text-xs font-medium transition-colors">
        🏠 בית בסדר
      </Link>
      {/* Friendly house companion — adds warmth/life (decorative) */}
      <Image
        src="/illustrations/mascot-home.jpg"
        alt=""
        aria-hidden="true"
        width={72}
        height={72}
        sizes="72px"
        className="bb-bob bb-logo-enter pointer-events-none absolute top-3 left-3 z-0 w-14 h-14 rounded-2xl object-cover border border-white/40 shadow-lg shadow-black/15 opacity-95"
      />
      <div className="text-center relative z-10">
        {/* User avatar in header */}
        <div className="flex justify-center mb-3">
          {avatarUrl ? (
            <div className="bb-logo-enter relative">
              <Image
                src={avatarUrl}
                alt={displayName}
                width={56}
                height={56}
                sizes="56px"
                className="w-14 h-14 rounded-2xl border-2 border-white/30 object-cover shadow-lg shadow-black/10"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success rounded-full border-2 border-white" />
            </div>
          ) : (
            <div className="bb-logo-enter w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg shadow-black/10">
              <span className="text-xl">
                {displayName.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">{greeting}</h1>
        <p className="text-sm text-white/60 font-medium mt-0.5">{hebrewDate}</p>
        {totalCount > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3.5 py-1.5 border border-white/10">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                completedCount === totalCount
                  ? "bg-green-400"
                  : "bg-white/60 animate-soft-pulse"
              }`}
            />
            <p className="text-xs text-white/90 font-medium">
              {completedCount === totalCount
                ? "🎉 יום מושלם! סיימתם הכל"
                : completedCount > 0
                  ? `${completedCount} מתוך ${totalCount} — ממשיכים! 💪`
                  : subtitle}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
