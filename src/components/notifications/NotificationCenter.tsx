"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import type { UseNotificationsReturn } from "@/hooks/useNotifications";

interface NotificationCenterProps {
  notifications: UseNotificationsReturn["notifications"];
  unreadCount: UseNotificationsReturn["unreadCount"];
  markAsRead: UseNotificationsReturn["markAsRead"];
  markAllAsRead: UseNotificationsReturn["markAllAsRead"];
  dismiss: UseNotificationsReturn["dismiss"];
}

export function NotificationCenter({
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
  dismiss,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={toggle}
        className="relative p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        aria-label={`התראות${unreadCount > 0 ? ` (${unreadCount} חדשות)` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center badge-pulse"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-auto mt-2 w-80 max-h-96 bg-surface dark:bg-[#1a1730] rounded-2xl shadow-xl dark:shadow-black/50 border border-border overflow-hidden z-50"
            style={{ minWidth: "300px" }}
            role="menu"
            aria-label="רשימת התראות"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">התראות</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors"
                  aria-label="סמן הכל כנקרא"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>סמן הכל כנקרא</span>
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto max-h-80 divide-y divide-border/50">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <span className="text-3xl block mb-2">🔔</span>
                  <p className="text-sm text-muted">אין התראות חדשות</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                      onDismiss={dismiss}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
