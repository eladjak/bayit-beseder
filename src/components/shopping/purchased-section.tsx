"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface PurchasedSectionProps {
  items: Array<{
    id: string;
    title: string;
    quantity?: number;
    unit?: string;
    category: string;
    checked: boolean;
    emoji?: string;
  }>;
  onUncheck: (itemId: string) => void;
  onClearAll: () => void;
  categoryIcons: Record<string, string>;
}

export function PurchasedSection({ items, onUncheck, onClearAll, categoryIcons }: PurchasedSectionProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (items.length === 0) return null;

  function handleClearClick() {
    if (confirmingClear) {
      onClearAll();
      setConfirmingClear(false);
      setIsOpen(false);
    } else {
      setConfirmingClear(true);
    }
  }

  function handleCancelClear() {
    setConfirmingClear(false);
  }

  return (
    <div className="mt-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setConfirmingClear(false);
        }}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          <span>{t("shopping.purchased") || "נרכש"} ✓</span>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {items.length}
          </span>
        </span>
        {isOpen ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="purchased-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {items.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400 text-center">
                {t("shopping.purchasedEmpty") || "אין פריטים שנרכשו"}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {items.map((item) => {
                  const icon = item.emoji ?? categoryIcons[item.category] ?? "📦";
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-2.5 bg-white/60 dark:bg-gray-900/40 group"
                    >
                      <span className="text-base opacity-50">{icon}</span>
                      <div className="flex-1 min-w-0 opacity-50">
                        <span className="text-sm line-through text-gray-500 dark:text-gray-400 truncate block">
                          {item.title}
                          {item.quantity ? ` × ${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : ""}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{item.category}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUncheck(item.id)}
                        aria-label={t("shopping.restore") || "החזר"}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-full text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Footer: clear all */}
            <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700/50">
              {confirmingClear ? (
                <>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t("shopping.confirmClear") || "בטוח?"}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelClear}
                    className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    onClick={handleClearClick}
                    className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    {t("shopping.clearPurchased") || "נקה הכל"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleClearClick}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors py-1 px-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={12} />
                  {t("shopping.clearPurchased") || "נקה הכל"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
