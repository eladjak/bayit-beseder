"use client";

import Link from "next/link";

export function PlaylistCard() {
  return (
    <Link
      href="/playlists"
      className="card-elevated flex items-center gap-3 px-4 py-3.5 active:scale-[0.98] transition-transform group"
    >
      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-primary/20">
        <span className="text-lg">🎵</span>
      </div>
      <div className="flex-1 text-right">
        <p className="font-semibold text-foreground text-sm">פלייליסטים</p>
        <p className="text-[11px] text-muted">שגרות ניקיון מודרכות עם טיימר</p>
      </div>
      <span className="text-muted text-xs group-hover:text-primary transition-colors">←</span>
    </Link>
  );
}
