"use client";

/**
 * Pet Selector — Alopik v2 Phase 3.
 *
 * Grid of all 20 pets. Locked pets show as dim w/ unlock requirement.
 * Active pet has rose border + check.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md
 */

import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { PETS, getActivePet, setActivePet, getCollection, type Pet } from "@/lib/pets";
import { copy } from "@/lib/copy-resolver";

type Props = {
  /** Current streak (used to determine which pets are unlocked) */
  readonly currentStreak: number;
};

export function PetSelector({ currentStreak }: Props) {
  const [activeId, setActiveId] = useState<string>("dog");
  const [collected, setCollected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveId(getActivePet().id);
    setCollected(new Set(getCollection()));
  }, []);

  const handleSelect = (pet: Pet) => {
    if (pet.unlockStreak > currentStreak && !collected.has(pet.id)) return;
    setActivePet(pet.id);
    setActiveId(pet.id);
  };

  const rarityColor: Record<Pet["rarity"], string> = {
    common: "border-gray-200",
    rare: "border-blue-300",
    epic: "border-violet-400",
  };

  return (
    <div className="alopik-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">{copy("petsHeader")}</h3>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {collected.size}/{PETS.length} נאספו
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {PETS.map((pet) => {
          const unlocked = pet.unlockStreak <= currentStreak || collected.has(pet.id);
          const isActive = activeId === pet.id;
          return (
            <button
              key={pet.id}
              type="button"
              onClick={() => handleSelect(pet)}
              disabled={!unlocked}
              aria-label={`${pet.name}${unlocked ? "" : ` — נפתח בstreak ${pet.unlockStreak}`}`}
              aria-pressed={isActive}
              className={`relative aspect-square rounded-lg border-2 flex items-center justify-center text-3xl transition-transform duration-150 ${
                unlocked
                  ? `${rarityColor[pet.rarity]} bg-white hover:scale-105 active:scale-95 cursor-pointer`
                  : "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
              } ${isActive ? "!border-indigo-600 ring-2 ring-indigo-200" : ""}`}
            >
              <span aria-hidden="true">{pet.emoji}</span>
              {isActive && (
                <Check
                  className="absolute -top-1 -end-1 size-4 text-white bg-indigo-600 rounded-full p-0.5"
                  aria-hidden="true"
                />
              )}
              {!unlocked && (
                <Lock
                  className="absolute bottom-1 end-1 size-3 text-gray-400"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-500 mt-3 text-center">
        חבר נדיר נפתח כשמרחיבים streak. נסה להגיע ל-30 ימים — מחכה לך 🐉.
      </p>
    </div>
  );
}
