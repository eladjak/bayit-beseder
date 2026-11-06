import { trackEvent } from "@/lib/analytics";
type Event = "started" | "ready" | "shopping" | "gift" | "swap" | "complete" | "saved" | "error" | "retry" | "owner" | "invite" | "blocked";
export function firstWeekEvent(event: Event, variant: "solo" | "shared", elapsedMs: number) {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const duration = seconds < 10 ? "0-9s" : seconds < 30 ? "10-29s" : seconds < 60 ? "30-59s" : seconds < 90 ? "60-89s" : seconds < 120 ? "90-119s" : seconds < 300 ? "120-299s" : "300s+";
  trackEvent(`first_week_${event}`, { variant, duration });
}
