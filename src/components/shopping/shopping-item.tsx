"use client";

import { motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import type { ShoppingItem as ShoppingItemType } from "@/hooks/useShoppingList";
import { CATEGORY_COLORS, SHOPPING_CATEGORY_ICONS } from "@/hooks/useShoppingList";

interface ShoppingItemProps {
  item: ShoppingItemType;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  /** Override color for the left border — takes precedence over CATEGORY_COLORS fallback */
  categoryColor?: string;
  /** Override icon for the item — takes precedence over SHOPPING_CATEGORY_ICONS fallback */
  categoryIcon?: string;
}

export function ShoppingItemCard({ item, onToggle, onRemove, categoryColor, categoryIcon }: ShoppingItemProps) {
  const borderColor = item.checked
    ? "var(--color-success)"
    : (categoryColor ?? CATEGORY_COLORS[item.category] ?? "#6B7280");

  const icon = categoryIcon ?? SHOPPING_CATEGORY_ICONS[item.category] ?? "📦";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`card-elevated p-3 flex items-center gap-3 relative overflow-hidden ${
        item.checked ? "opacity-50" : ""
      }`}
      style={{
        borderInlineStart: `3px solid ${borderColor}`,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        aria-label={item.checked ? `בטל סימון: ${item.title}` : `סמן כנרכש: ${item.title}`}
        aria-pressed={item.checked}
        className="w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
        style={{
          borderColor: item.checked
            ? "var(--color-success)"
            : "var(--color-border)",
          backgroundColor: item.checked
            ? "var(--color-success)"
            : "transparent",
        }}
      >
        {item.checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </motion.div>
        )}
      </button>

      {/* Category icon */}
      <span className="text-sm flex-shrink-0" aria-hidden>{icon}</span>

      {/* Title */}
      <span
        className={`flex-1 text-sm font-medium ${
          item.checked ? "line-through text-muted" : "text-foreground"
        }`}
      >
        {item.title}
      </span>

      {/* Quantity badge */}
      {item.quantity && item.quantity > 1 && (
        <span className="text-[11px] px-1.5 py-0.5 bg-border/50 rounded-md text-muted font-medium">
          x{item.quantity} {item.unit ?? ""}
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={() => onRemove(item.id)}
        aria-label={`מחיקת פריט: ${item.title}`}
        className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
