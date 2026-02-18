"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { formatRelativeTime } from "@/hooks/useNotifications";
import type { Notification } from "@/hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function NotificationItem({
  notification,
  onRead,
  onDismiss,
}: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors active:scale-[0.98] ${
        notification.read
          ? "bg-transparent"
          : "bg-primary/5"
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${notification.title}: ${notification.message}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      {/* Icon */}
      <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
        {notification.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold truncate ${
              notification.read ? "text-muted" : "text-foreground"
            }`}
          >
            {notification.title}
          </span>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 badge-pulse" />
          )}
        </div>
        <p
          className={`text-xs mt-0.5 leading-relaxed ${
            notification.read ? "text-muted/70" : "text-muted"
          }`}
        >
          {notification.message}
        </p>
        <p className="text-[10px] text-muted/50 mt-1">
          {formatRelativeTime(notification.timestamp)}
        </p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className="text-muted/40 hover:text-muted p-1 rounded-lg transition-colors flex-shrink-0"
        aria-label="סגור התראה"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
