"use client";

import { useCallback } from "react";
import useSound from "use-sound";

type SoundName =
  | "complete"
  | "achievement"
  | "streak"
  | "partner"
  | "error"
  | "tap";

const SOUND_MAP: Record<SoundName, string> = {
  complete: "/sounds/complete.mp3",
  achievement: "/sounds/achievement.mp3",
  streak: "/sounds/streak.mp3",
  partner: "/sounds/partner.mp3",
  error: "/sounds/error.mp3",
  tap: "/sounds/tap.mp3",
};

function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("bayit-sound-enabled") !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem("bayit-sound-enabled", enabled ? "true" : "false");
}

export function useAppSound(sound: SoundName) {
  const [play] = useSound(SOUND_MAP[sound], {
    volume: 0.5,
    soundEnabled: getSoundEnabled(),
  });

  const playIfEnabled = useCallback(() => {
    if (getSoundEnabled()) {
      play();
    }
  }, [play]);

  return playIfEnabled;
}

export function useAppSounds() {
  const playComplete = useAppSound("complete");
  const playAchievement = useAppSound("achievement");
  const playStreak = useAppSound("streak");
  const playPartner = useAppSound("partner");
  const playError = useAppSound("error");
  const playTap = useAppSound("tap");

  return {
    playComplete,
    playAchievement,
    playStreak,
    playPartner,
    playError,
    playTap,
  };
}
