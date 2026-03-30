"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useTranslation } from "@/hooks/useTranslation";

function AvatarCircle({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex-shrink-0 bg-primary/15 flex items-center justify-center text-xs font-bold text-primary"
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export const ActivityFeed = memo(function ActivityFeed() {
  const { activities, isLoading, getRelativeTime } = useActivityFeed();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-2.5" aria-label={t("common.loading")} aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-surface animate-pulse h-14"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-2xl mb-2" aria-hidden="true">🏠</p>
        <p className="text-sm text-muted">{t("activity.noActivity")}</p>
      </div>
    );
  }

  return (
    <div
      className="max-h-72 overflow-y-auto space-y-1.5 -mx-1 px-1"
      role="feed"
      aria-label={t("activity.title")}
    >
      {activities.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.04 }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
            index % 2 === 0
              ? "bg-surface"
              : "bg-surface/60"
          }`}
        >
          {/* Avatar */}
          <AvatarCircle name={item.userName} avatarUrl={item.avatarUrl} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-snug truncate">
              <span className="font-medium">{item.userName}</span>
              {" — "}
              <span className="text-muted">{item.title.replace(/^.*?:\s*/, "")}</span>
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              {getRelativeTime(item.timestamp)}
            </p>
          </div>

          {/* Icon */}
          <span
            className="text-base flex-shrink-0"
            aria-hidden="true"
          >
            {item.icon}
          </span>
        </motion.div>
      ))}
    </div>
  );
});
