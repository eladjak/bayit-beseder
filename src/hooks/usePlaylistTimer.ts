"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Playlist } from "@/lib/playlists";
import { haptic } from "@/lib/haptics";

export interface PlaylistTimerState {
  currentPlaylist: Playlist | null;
  currentTaskIndex: number;
  secondsRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  progressPercent: number;
  totalElapsedSeconds: number;
}

export interface PlaylistTimerActions {
  start: (playlist: Playlist) => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  stop: () => void;
}

const INITIAL_STATE: PlaylistTimerState = {
  currentPlaylist: null,
  currentTaskIndex: 0,
  secondsRemaining: 0,
  isRunning: false,
  isPaused: false,
  isComplete: false,
  progressPercent: 0,
  totalElapsedSeconds: 0,
};

export function usePlaylistTimer(): PlaylistTimerState & PlaylistTimerActions {
  const [state, setState] = useState<PlaylistTimerState>(INITIAL_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const computeProgress = useCallback(
    (playlist: Playlist, taskIndex: number, secsRemaining: number): number => {
      const totalSeconds = playlist.tasks.reduce(
        (sum, t) => sum + t.durationSeconds,
        0
      );
      const completedSeconds = playlist.tasks
        .slice(0, taskIndex)
        .reduce((sum, t) => sum + t.durationSeconds, 0);
      const currentTaskDuration = playlist.tasks[taskIndex]?.durationSeconds ?? 0;
      const elapsedInCurrentTask = currentTaskDuration - secsRemaining;
      const elapsed = completedSeconds + elapsedInCurrentTask;
      return totalSeconds > 0 ? Math.round((elapsed / totalSeconds) * 100) : 0;
    },
    []
  );

  const advanceTask = useCallback(
    (playlist: Playlist, currentIndex: number) => {
      haptic("success");
      const nextIndex = currentIndex + 1;

      if (nextIndex >= playlist.tasks.length) {
        // All done
        clearTimer();
        haptic("celebration");
        const totalSeconds = playlist.tasks.reduce(
          (sum, t) => sum + t.durationSeconds,
          0
        );
        setState((prev) => ({
          ...prev,
          isRunning: false,
          isPaused: false,
          isComplete: true,
          progressPercent: 100,
          totalElapsedSeconds: totalSeconds,
          secondsRemaining: 0,
        }));
        return;
      }

      const nextTask = playlist.tasks[nextIndex];
      setState((prev) => ({
        ...prev,
        currentTaskIndex: nextIndex,
        secondsRemaining: nextTask.durationSeconds,
        progressPercent: computeProgress(
          playlist,
          nextIndex,
          nextTask.durationSeconds
        ),
      }));
    },
    [clearTimer, computeProgress]
  );

  // Tick logic - run inside effect so we always have fresh state
  useEffect(() => {
    if (!state.isRunning || state.isPaused || !state.currentPlaylist) return;

    clearTimer();
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (!prev.currentPlaylist || !prev.isRunning || prev.isPaused)
          return prev;

        const newSecs = prev.secondsRemaining - 1;

        if (newSecs <= 0) {
          // Will trigger advanceTask on next render cycle via the effect below
          return {
            ...prev,
            secondsRemaining: 0,
            totalElapsedSeconds: prev.totalElapsedSeconds + 1,
          };
        }

        return {
          ...prev,
          secondsRemaining: newSecs,
          totalElapsedSeconds: prev.totalElapsedSeconds + 1,
          progressPercent: computeProgress(
            prev.currentPlaylist,
            prev.currentTaskIndex,
            newSecs
          ),
        };
      });
    }, 1000);

    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isRunning, state.isPaused]);

  // Watch for task expiry (secondsRemaining hits 0 while running)
  const prevSecsRef = useRef(state.secondsRemaining);
  useEffect(() => {
    const wasRunning = state.isRunning && !state.isPaused;
    const justHitZero =
      prevSecsRef.current > 0 && state.secondsRemaining === 0;

    if (wasRunning && justHitZero && state.currentPlaylist && !state.isComplete) {
      advanceTask(state.currentPlaylist, state.currentTaskIndex);
    }
    prevSecsRef.current = state.secondsRemaining;
  }, [
    state.secondsRemaining,
    state.isRunning,
    state.isPaused,
    state.isComplete,
    state.currentPlaylist,
    state.currentTaskIndex,
    advanceTask,
  ]);

  const start = useCallback(
    (playlist: Playlist) => {
      clearTimer();
      const firstTask = playlist.tasks[0];
      if (!firstTask) return;

      haptic("tap");
      setState({
        currentPlaylist: playlist,
        currentTaskIndex: 0,
        secondsRemaining: firstTask.durationSeconds,
        isRunning: true,
        isPaused: false,
        isComplete: false,
        progressPercent: 0,
        totalElapsedSeconds: 0,
      });
    },
    [clearTimer]
  );

  const pause = useCallback(() => {
    haptic("tap");
    clearTimer();
    setState((prev) => ({ ...prev, isPaused: true }));
  }, [clearTimer]);

  const resume = useCallback(() => {
    haptic("tap");
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  const skip = useCallback(() => {
    setState((prev) => {
      if (!prev.currentPlaylist) return prev;
      haptic("notification");
      const nextIndex = prev.currentTaskIndex + 1;

      if (nextIndex >= prev.currentPlaylist.tasks.length) {
        clearTimer();
        return {
          ...prev,
          isRunning: false,
          isPaused: false,
          isComplete: true,
          progressPercent: 100,
          secondsRemaining: 0,
        };
      }

      const nextTask = prev.currentPlaylist.tasks[nextIndex];
      return {
        ...prev,
        currentTaskIndex: nextIndex,
        secondsRemaining: nextTask.durationSeconds,
        progressPercent: computeProgress(
          prev.currentPlaylist,
          nextIndex,
          nextTask.durationSeconds
        ),
      };
    });
  }, [clearTimer, computeProgress]);

  const stop = useCallback(() => {
    clearTimer();
    haptic("tap");
    setState(INITIAL_STATE);
  }, [clearTimer]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  return { ...state, start, pause, resume, skip, stop };
}
