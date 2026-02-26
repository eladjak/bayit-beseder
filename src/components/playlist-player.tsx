"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { X, SkipForward, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import type { PlaylistTimerState, PlaylistTimerActions } from "@/hooks/usePlaylistTimer";

interface PlaylistPlayerProps
  extends PlaylistTimerState,
    PlaylistTimerActions {}

export function PlaylistPlayer({
  currentPlaylist,
  currentTaskIndex,
  secondsRemaining,
  isRunning,
  isPaused,
  isComplete,
  progressPercent,
  pause,
  resume,
  skip,
  stop,
}: PlaylistPlayerProps) {
  // Fire confetti when playlist completes
  const fireCompletion = useCallback(() => {
    const duration = 2500;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#6366F1", "#22C55E", "#FFD700"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#6366F1", "#22C55E", "#FFD700"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  useEffect(() => {
    if (isComplete) {
      fireCompletion();
      toast.success("הפלייליסט הושלם! כל הכבוד! 🎉", {
        duration: 4000,
      });
    }
  }, [isComplete, fireCompletion]);

  if (!currentPlaylist) return null;

  const currentTask = currentPlaylist.tasks[currentTaskIndex];
  const totalTasks = currentPlaylist.tasks.length;

  // SVG ring dimensions
  const size = 220;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Per-task progress (for the ring)
  const taskDuration = currentTask?.durationSeconds ?? 1;
  const taskProgress = isComplete
    ? 100
    : Math.max(0, Math.round(((taskDuration - secondsRemaining) / taskDuration) * 100));
  const ringOffset = circumference - (taskProgress / 100) * circumference;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--color-background)" }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
    >
      {/* Header */}
      <div className="gradient-hero px-4 pt-safe-top pb-6 pt-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={stop}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="עצור פלייליסט"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="text-center flex-1 mx-3">
            <p className="text-white/70 text-xs font-medium">פלייליסט</p>
            <h1 className="text-white font-bold text-base truncate">
              {currentPlaylist.icon} {currentPlaylist.name}
            </h1>
          </div>
          <div className="w-9" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-between px-4 py-6 overflow-hidden">
        {/* Completion state */}
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="complete"
              className="flex-1 flex flex-col items-center justify-center gap-5 text-center"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <motion.div
                className="text-7xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">
                הפלייליסט הושלם!
              </h2>
              <p className="text-muted text-sm">
                {currentPlaylist.name} — {currentPlaylist.totalMinutes} דקות
              </p>
              <button
                onClick={stop}
                className="mt-4 px-8 py-3 gradient-primary rounded-2xl text-white font-semibold text-base active:scale-95 transition-transform"
              >
                סיום
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="timer"
              className="flex-1 flex flex-col items-center justify-center gap-6 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Circular countdown ring */}
              <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                  <defs>
                    <linearGradient
                      id="playlist-ring-gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#6366F1" />
                      <stop offset="50%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#A78BFA" />
                    </linearGradient>
                  </defs>
                  {/* Background track */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth={strokeWidth}
                    opacity={0.4}
                  />
                  {/* Progress arc */}
                  <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#playlist-ring-gradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset: ringOffset }}
                    transition={{ duration: 0.5, ease: "linear" }}
                  />
                </svg>
                {/* Center: timer */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={timeDisplay}
                      className="text-4xl font-bold"
                      style={{ color: "var(--color-primary)" }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {timeDisplay}
                    </motion.span>
                  </AnimatePresence>
                  {isPaused && (
                    <span className="text-xs text-muted font-medium">מושהה</span>
                  )}
                </div>
              </div>

              {/* Current task name */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTaskIndex}
                  className="text-center px-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ type: "spring", duration: 0.4 }}
                >
                  <p className="text-xs text-muted font-medium mb-1">
                    משימה {currentTaskIndex + 1} מתוך {totalTasks}
                  </p>
                  <h2 className="text-2xl font-bold text-foreground">
                    {currentTask?.title}
                  </h2>
                </motion.div>
              </AnimatePresence>

              {/* Task dots */}
              <div className="flex items-center gap-2 flex-wrap justify-center px-6">
                {currentPlaylist.tasks.map((task, i) => (
                  <motion.div
                    key={`${task.title}-${i}`}
                    title={task.title}
                    className="rounded-full"
                    style={{
                      width: i === currentTaskIndex ? 20 : 10,
                      height: 10,
                      background:
                        i < currentTaskIndex
                          ? "var(--color-success)"
                          : i === currentTaskIndex
                          ? "var(--color-primary)"
                          : "var(--color-border)",
                    }}
                    animate={
                      i === currentTaskIndex
                        ? { scale: [1, 1.2, 1] }
                        : { scale: 1 }
                    }
                    transition={
                      i === currentTaskIndex
                        ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
                        : {}
                    }
                  />
                ))}
              </div>

              {/* Overall progress bar */}
              <div className="w-full px-6">
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "var(--color-primary)" }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted">
                    {progressPercent}%
                  </span>
                  <span className="text-[10px] text-muted">
                    {currentPlaylist.totalMinutes} דק׳
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        {!isComplete && (
          <div className="flex items-center gap-4 pb-4">
            {/* Stop */}
            <button
              onClick={stop}
              className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="עצור"
            >
              <Square className="w-5 h-5 text-danger" />
            </button>

            {/* Pause / Resume - main button */}
            <button
              onClick={isPaused ? resume : pause}
              className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center active:scale-95 transition-transform shadow-lg"
              aria-label={isPaused ? "המשך" : "השהה"}
            >
              {isPaused ? (
                <Play className="w-8 h-8 text-white" fill="white" />
              ) : (
                <Pause className="w-8 h-8 text-white" fill="white" />
              )}
            </button>

            {/* Skip */}
            <button
              onClick={skip}
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="דלג"
            >
              <SkipForward className="w-5 h-5 text-primary" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
