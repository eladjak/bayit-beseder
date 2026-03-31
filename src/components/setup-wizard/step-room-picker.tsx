"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { ROOM_DEFINITIONS, getTaskCountForRoom } from "@/lib/room-task-templates";
import type { CleaningLevel, RoomDefinition } from "@/lib/room-task-templates";

interface StepRoomPickerProps {
  level: CleaningLevel;
  selectedRoomIds: string[];
  onConfirm: (rooms: RoomDefinition[]) => void;
  onBack: () => void;
}

export function StepRoomPicker({ level, selectedRoomIds, onConfirm, onBack }: StepRoomPickerProps) {
  const { t, locale } = useTranslation();
  const isRtl = locale === "he";
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedRoomIds));

  const toggleRoom = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const rooms = ROOM_DEFINITIONS.filter((r) => selected.has(r.id));
    onConfirm(rooms);
  };

  const totalTasks = Array.from(selected).reduce(
    (sum, id) => sum + getTaskCountForRoom(id, level),
    0
  );

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground">
          {t("setupWizard.stepRooms")}
        </h2>
        <p className="text-sm text-muted mt-1">
          {selected.size > 0
            ? (t("setupWizard.totalTasks") || "")
                .replace("{count}", String(totalTasks))
                .replace("{rooms}", String(selected.size))
            : isRtl ? "בחרו את החדרים בבית שלכם" : "Select the rooms in your home"}
        </p>
      </div>

      {/* Room grid */}
      <div className="grid grid-cols-2 gap-3">
        {ROOM_DEFINITIONS.map((room, index) => {
          const isSelected = selected.has(room.id);
          const taskCount = getTaskCountForRoom(room.id, level);

          return (
            <motion.button
              key={room.id}
              onClick={() => toggleRoom(room.id)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              className={[
                "relative p-4 rounded-2xl border-2 transition-all text-center",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-surface hover:border-primary/30",
              ].join(" ")}
            >
              {/* Selected check */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </motion.div>
              )}

              <span className="text-3xl block mb-2">{room.icon}</span>
              <span className="text-sm font-semibold text-foreground block">
                {isRtl ? room.nameHe : room.nameEn}
              </span>
              <span className="text-[11px] text-muted mt-0.5 block">
                {(t("setupWizard.roomCount") || "{count} tasks").replace("{count}", String(taskCount))}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          {t("setupWizard.back")}
        </button>
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0}
          className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {t("setupWizard.next")} ({selected.size})
        </button>
      </div>
    </div>
  );
}
