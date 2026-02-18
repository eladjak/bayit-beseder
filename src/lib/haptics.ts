type HapticPattern = "tap" | "success" | "error" | "notification" | "celebration";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [15, 50, 15],
  error: [30, 30, 30, 30, 50],
  notification: [15, 100, 15],
  celebration: [15, 30, 15, 30, 15, 30, 50],
};

export function haptic(pattern: HapticPattern): void {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;

  navigator.vibrate(PATTERNS[pattern]);
}
