"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  type ZoneDayMapping,
  DEFAULT_ZONE_MAPPINGS,
  loadZoneMappings,
  saveZoneMappings,
  isZoneModeEnabled,
  setZoneModeEnabled,
  buildZoneDaySummary,
} from "@/lib/zones";
import type { CategoryKey } from "@/lib/categories";

export interface UseZoneConfigReturn {
  /** Whether zone mode is active */
  zoneMode: boolean;
  /** Toggle zone mode on/off */
  toggleZoneMode: () => void;
  /** Current zone-to-day mappings */
  zoneMappings: ZoneDayMapping[];
  /** Summary of zones per day (for display) */
  zoneDaySummary: ReturnType<typeof buildZoneDaySummary>;
  /** Move a zone to a different day */
  moveZone: (zone: CategoryKey, newDay: number) => void;
  /** Reset to default mappings */
  resetMappings: () => void;
}

export function useZoneConfig(): UseZoneConfigReturn {
  const [zoneMode, setZoneMode] = useState(false);
  const [zoneMappings, setZoneMappings] = useState<ZoneDayMapping[]>(DEFAULT_ZONE_MAPPINGS);

  // Load from localStorage on mount
  useEffect(() => {
    setZoneMode(isZoneModeEnabled());
    setZoneMappings(loadZoneMappings());
  }, []);

  const toggleZoneMode = useCallback(() => {
    setZoneMode((prev) => {
      const next = !prev;
      setZoneModeEnabled(next);
      return next;
    });
  }, []);

  const moveZone = useCallback((zone: CategoryKey, newDay: number) => {
    setZoneMappings((prev) => {
      const updated = prev.map((m) =>
        m.zone === zone ? { ...m, preferredDays: [newDay] } : m
      );
      saveZoneMappings(updated);
      return updated;
    });
  }, []);

  const resetMappings = useCallback(() => {
    setZoneMappings(DEFAULT_ZONE_MAPPINGS);
    saveZoneMappings(DEFAULT_ZONE_MAPPINGS);
  }, []);

  const zoneDaySummary = useMemo(
    () => buildZoneDaySummary(zoneMappings),
    [zoneMappings]
  );

  return {
    zoneMode,
    toggleZoneMode,
    zoneMappings,
    zoneDaySummary,
    moveZone,
    resetMappings,
  };
}
