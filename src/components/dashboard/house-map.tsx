"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Home } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface Task {
  id: string;
  category_id: string | null;
  status: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface HouseMapProps {
  tasks: Task[];
  categories: Category[];
}

interface RoomStats {
  category: Category;
  total: number;
  completed: number;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 380,
      damping: 24,
    },
  },
};

export function HouseMap({ tasks, categories }: HouseMapProps) {
  const { t } = useTranslation();

  // Build per-category stats, filtering out categories with no tasks
  const roomStats: RoomStats[] = categories
    .map((category) => {
      const categoryTasks = tasks.filter((task) => task.category_id === category.id);
      const completed = categoryTasks.filter((task) => task.status === "completed").length;
      return { category, total: categoryTasks.length, completed };
    })
    .filter((room) => room.total > 0);

  return (
    <section aria-label={t("houseMap.title")}>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Home className="w-4 h-4 text-primary" aria-hidden="true" />
        <h2 className="font-semibold text-foreground text-sm">{t("houseMap.title")}</h2>
      </div>

      {roomStats.length === 0 ? (
        // Empty state
        <motion.div
          className="card-elevated p-6 text-center"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <p className="text-2xl mb-2" aria-hidden="true">
            🏠
          </p>
          <p className="text-sm font-medium text-foreground">{t("houseMap.noRooms")}</p>
          <Link
            href="/tasks"
            className="mt-2 inline-block text-xs text-primary font-medium underline underline-offset-2"
          >
            {t("houseMap.addTasks")}
          </Link>
        </motion.div>
      ) : (
        // 2-column grid of room cards
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          role="list"
          aria-label={t("houseMap.title")}
        >
          {roomStats.map(({ category, total, completed }) => {
            const isAllDone = completed === total;
            const progressPct = total > 0 ? (completed / total) * 100 : 0;

            return (
              <motion.div key={category.id} variants={cardVariants} role="listitem">
                <Link
                  href={`/tasks?category=${category.id}`}
                  className="card-elevated p-4 flex flex-col items-center gap-2 relative overflow-hidden block
                    hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
                  aria-label={`${category.name}: ${completed}/${total}`}
                >
                  {/* All-done badge (top-left corner, doesn't obscure content) */}
                  {isAllDone && (
                    <motion.div
                      className="absolute top-1.5 left-1.5 z-10 bg-success text-white rounded-full p-0.5 shadow-sm"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      aria-label={t("houseMap.allDone") || "הכל הושלם"}
                    >
                      <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                    </motion.div>
                  )}

                  {/* Room icon */}
                  <span className="text-3xl leading-none" aria-hidden="true">
                    {category.icon}
                  </span>

                  {/* Room name */}
                  <p className="text-xs font-semibold text-foreground text-center leading-tight">
                    {category.name}
                  </p>

                  {/* Progress text */}
                  <p
                    className="text-[11px] font-medium text-muted"
                    aria-label={`${completed} מתוך ${total}`}
                  >
                    {completed}/{total}
                  </p>

                  {/* Animated progress bar */}
                  <div
                    className="w-full h-1.5 bg-surface rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: category.color }}
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ scaleX: progressPct / 100 }}
                      transition={{ type: "spring", stiffness: 280, damping: 28, delay: 0.1 }}
                    />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}
