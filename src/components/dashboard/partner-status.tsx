"use client";

import { User } from "lucide-react";

interface PartnerStatusProps {
  name: string;
  avatarUrl?: string;
  completedCount: number;
  totalCount: number;
  recentTasks: string[];
}

export function PartnerStatus({
  name,
  avatarUrl,
  completedCount,
  totalCount,
  recentTasks,
}: PartnerStatusProps) {
  return (
    <div className="bg-surface rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary-light/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted">
            {completedCount}/{totalCount} משימות היום
          </p>
        </div>
      </div>
      {recentTasks.length > 0 && (
        <div className="space-y-1">
          {recentTasks.map((task, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted">
              <span className="text-success">✓</span>
              <span>{task}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
