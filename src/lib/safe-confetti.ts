/**
 * Confetti wrapper that respects prefers-reduced-motion.
 * Import this instead of canvas-confetti directly.
 */
export async function fireConfetti(
  options?: Parameters<typeof import("canvas-confetti").default>[0]
): Promise<void> {
  // Skip confetti entirely if user prefers reduced motion
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const { default: confetti } = await import("canvas-confetti");
  confetti(options);
}

/**
 * Fire a celebration burst (common pattern in the app).
 */
export async function fireCelebration(): Promise<void> {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
  });
}
