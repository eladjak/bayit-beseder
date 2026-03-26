"use client";

import { motion } from "framer-motion";
import { Share2, Download } from "lucide-react";
import { useRef, useCallback } from "react";
import { toast } from "sonner";

interface WeeklyShareCardProps {
  weekRange: string;
  completedTasks: number;
  totalTasks: number;
  streakDays: number;
  topCategory: { name: string; icon: string; count: number } | null;
  householdName: string;
}

export function WeeklyShareCard({
  weekRange,
  completedTasks,
  totalTasks,
  streakDays,
  topCategory,
  householdName,
}: WeeklyShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getEmoji = () => {
    if (percentage >= 90) return "🏆";
    if (percentage >= 70) return "⭐";
    if (percentage >= 50) return "💪";
    return "🌱";
  };

  const getMessage = () => {
    if (percentage >= 90) return "שבוע מושלם!";
    if (percentage >= 70) return "שבוע מצוין!";
    if (percentage >= 50) return "כל הכבוד!";
    return "בדרך הנכונה!";
  };

  const handleShare = useCallback(async () => {
    const text = `${getEmoji()} ${getMessage()}\n${householdName} — ${weekRange}\n✅ ${completedTasks}/${totalTasks} משימות (${percentage}%)\n🔥 ${streakDays} ימים ברצף\n\nבית בסדר — bayitbeseder.com\n🧪 גרסה ראשונה — נשמח למשוב! eladjak@gmail.com`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success("הועתק ללוח! שתפו בוואטסאפ");
    } catch {
      toast.error("לא ניתן להעתיק");
    }
  }, [completedTasks, totalTasks, percentage, streakDays, householdName, weekRange]);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-5 text-white"
      style={{
        background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #DB2777 100%)",
      }}
    >
      {/* Decorative pattern */}
      <div className="absolute top-2 left-3 text-5xl opacity-10">{getEmoji()}</div>
      <div className="absolute bottom-2 right-3 text-3xl opacity-10">🏠</div>

      {/* Header */}
      <div className="relative z-10">
        <div className="text-xs opacity-70 mb-1">{weekRange}</div>
        <div className="text-lg font-bold mb-3">
          {getEmoji()} {getMessage()}
        </div>

        {/* Stats row */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{percentage}%</div>
            <div className="text-[10px] opacity-80">השלמה</div>
          </div>
          <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{completedTasks}</div>
            <div className="text-[10px] opacity-80">משימות</div>
          </div>
          <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">🔥 {streakDays}</div>
            <div className="text-[10px] opacity-80">רצף</div>
          </div>
        </div>

        {/* Top category */}
        {topCategory && (
          <div className="text-xs opacity-80 mb-3">
            {topCategory.icon} קטגוריה מובילה: {topCategory.name} ({topCategory.count} משימות)
          </div>
        )}

        {/* Progress bar */}
        <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-white/80 rounded-full"
            style={{ transformOrigin: "right" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: percentage / 100 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Footer with branding + share */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] opacity-60">
            bayitbeseder.com — {householdName}
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium hover:bg-white/30 transition-colors active:scale-95"
            aria-label="שיתוף סיכום שבועי"
          >
            <Share2 className="w-3.5 h-3.5" />
            שיתוף
          </button>
        </div>
      </div>
    </motion.div>
  );
}
