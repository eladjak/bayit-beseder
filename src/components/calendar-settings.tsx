"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  RefreshCw,
  Loader2,
  Link2Off,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";

interface SyncResult {
  created: number;
  skipped: number;
  errors: string[];
  lastSync: string;
  totalTasks: number;
}

interface CalendarStatus {
  connected: boolean;
  calendarId: string | null;
  lastSync?: string;
}

export function CalendarSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<CalendarStatus>({
    connected: false,
    calendarId: null,
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Fetch current connection status
  const fetchStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/calendar/sync");
      if (res.ok) {
        const data = (await res.json()) as CalendarStatus;
        setStatus(data);
      }
    } catch {
      // Ignore — not critical
    }
  }, [user]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // Handle redirect back from Google OAuth
  useEffect(() => {
    const calendar = searchParams.get("calendar");
    const reason = searchParams.get("reason");

    if (calendar === "connected") {
      toast.success("Google Calendar חובר בהצלחה!");
      void fetchStatus();
      // Clean up the query param without full reload
      const url = new URL(window.location.href);
      url.searchParams.delete("calendar");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    } else if (calendar === "error") {
      const msg =
        reason === "save_failed"
          ? "שגיאה בשמירת ההרשאות. נסו שוב."
          : reason === "not_authenticated"
            ? "יש להתחבר לפני חיבור Calendar."
            : reason === "state_mismatch"
              ? "שגיאת אבטחה בתהליך ההתחברות. נסו שוב."
              : reason === "access_denied"
                ? "הגישה ל-Google Calendar נדחתה. יש לאשר את ההרשאות."
                : "שגיאה בחיבור Google Calendar. נסו שוב.";
      toast.error(msg);
      const url = new URL(window.location.href);
      url.searchParams.delete("calendar");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, fetchStatus]);

  // Connect — redirect to Google OAuth
  const handleConnect = useCallback(() => {
    setLoading(true);
    window.location.href = "/api/calendar/connect";
  }, []);

  // Sync now
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "שגיאה בסנכרון");
        return;
      }
      const result = (await res.json()) as SyncResult;
      setLastSyncResult(result);
      setStatus((prev) => ({ ...prev, lastSync: result.lastSync }));

      if (result.errors.length > 0) {
        toast.warning(
          `הסנכרון הושלם עם ${result.errors.length} שגיאות. נוצרו ${result.created} אירועים.`
        );
      } else {
        toast.success(
          result.created === 0
            ? "הכל מסונכרן — לא היו משימות חדשות לסנכרן."
            : `נוצרו ${result.created} אירועי יומן בהצלחה!`
        );
      }
    } catch {
      toast.error("שגיאה בחיבור לשרת");
    } finally {
      setSyncing(false);
    }
  }, []);

  // Disconnect
  const handleDisconnect = useCallback(async () => {
    if (
      !confirm(
        "האם לנתק את Google Calendar? הנתונים בלוח השנה לא יימחקו."
      )
    ) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch("/api/calendar/disconnect", { method: "POST" });
      if (!res.ok) {
        toast.error("שגיאה בניתוק Google Calendar");
        return;
      }
      setStatus({ connected: false, calendarId: null });
      setLastSyncResult(null);
      toast.success("Google Calendar נותק בהצלחה");
    } catch {
      toast.error("שגיאה בחיבור לשרת");
    } finally {
      setDisconnecting(false);
    }
  }, []);

  if (!user) return null;

  return (
    <section className="card-elevated p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-sm">Google Calendar</h2>
      </div>

      <AnimatePresence mode="wait">
        {status.connected ? (
          <motion.div
            key="connected"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Connected badge */}
            <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t("settings.calendarSection.connectedBadge")}
                </p>
                {status.lastSync && (
                  <p className="text-xs text-muted">
                    {t("settings.calendarSection.lastSync")}{" "}
                    {new Date(status.lastSync).toLocaleString("he-IL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Last sync result summary */}
            {lastSyncResult && (
              <div className="text-xs text-muted bg-surface rounded-xl px-4 py-3 space-y-1">
                <p>
                  {lastSyncResult.created}{" "}
                  {t("settings.calendarSection.syncedCreated")} ·{" "}
                  {lastSyncResult.skipped}{" "}
                  {t("settings.calendarSection.syncedSkipped")} ·{" "}
                  {lastSyncResult.totalTasks}{" "}
                  {t("settings.calendarSection.syncedChecked")}
                </p>
                {lastSyncResult.errors.length > 0 && (
                  <p className="text-warning">
                    {lastSyncResult.errors.length}{" "}
                    {t("settings.calendarSection.syncErrors")}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 gradient-primary text-white rounded-2xl text-sm font-semibold shadow-md shadow-primary/20 disabled:opacity-50 active:scale-95 transition-transform"
                aria-label={t("settings.calendarSection.syncLabel")}
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {syncing
                  ? t("settings.calendarSection.syncing")
                  : t("settings.calendarSection.syncNow")}
              </button>

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-danger/30 text-danger text-sm font-medium hover:bg-danger/5 transition-colors disabled:opacity-50"
                aria-label={t("settings.calendarSection.disconnectLabel")}
              >
                {disconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2Off className="w-4 h-4" />
                )}
                {disconnecting
                  ? t("settings.calendarSection.disconnecting")
                  : t("settings.calendarSection.disconnect")}
              </button>
            </div>

            <p className="text-xs text-muted">
              {t("settings.calendarSection.syncHint")}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-muted">
              {t("settings.calendarSection.connectHint")}
            </p>

            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 gradient-primary text-white rounded-2xl font-semibold text-sm shadow-md shadow-primary/20 disabled:opacity-50 active:scale-95 transition-transform"
              aria-label={t("settings.calendarSection.connectLabel")}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {loading
                ? t("settings.calendarSection.connecting")
                : t("settings.calendarSection.connect")}
            </button>

            <p className="text-[10px] text-muted">
              {t("settings.calendarSection.securityHint")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
