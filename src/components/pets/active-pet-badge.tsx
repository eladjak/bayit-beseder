"use client";

/**
 * Active Pet Badge — Alopik v2 Phase 3.
 *
 * Small floating emoji of currently-active pet. Sits in dashboard corner,
 * animates gently. Click → opens PetSelector.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { useEffect, useState } from "react";
import { getActivePet, type Pet } from "@/lib/pets";

type Props = {
  readonly onClick?: () => void;
};

export function ActivePetBadge({ onClick }: Props) {
  const [pet, setPet] = useState<Pet | null>(null);

  useEffect(() => {
    setPet(getActivePet());
    // Re-read on visibility change (returning to tab) — picks up changes
    // from PetSelector in other tabs
    const onVisible = () => {
      if (document.visibilityState === "visible") setPet(getActivePet());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (!pet) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`החבר/ה שלך: ${pet.name}. לחץ להחלפה.`}
      className="inline-flex items-center justify-center size-9 rounded-full bg-indigo-50 border border-indigo-100 text-xl hover:scale-110 active:scale-95 transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
    >
      <span aria-hidden="true" className="select-none">{pet.emoji}</span>
    </button>
  );
}
