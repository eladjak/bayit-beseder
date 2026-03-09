"use client";

import { EnergyModeToggle } from "@/components/dashboard/energy-mode-toggle";
import type { EnergyLevel } from "@/lib/energy-filter";

interface EnergyModeSectionProps {
  energyLevel: EnergyLevel;
  onToggle: () => void;
  filteredCount: number;
  totalCount: number;
}

export function EnergyModeSection({
  energyLevel,
  onToggle,
  filteredCount,
  totalCount,
}: EnergyModeSectionProps) {
  return (
    <div className="flex items-center justify-between">
      <EnergyModeToggle energyLevel={energyLevel} onToggle={onToggle} />
      {energyLevel !== "all" && (
        <span className="text-[11px] text-muted">
          {filteredCount} מתוך {totalCount} משימות
        </span>
      )}
    </div>
  );
}
