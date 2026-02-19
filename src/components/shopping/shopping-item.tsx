"use client";

import { motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import type { ShoppingItem as ShoppingItemType } from "@/hooks/useShoppingList";
import { CATEGORY_COLORS } from "@/hooks/useShoppingList";

interface ShoppingItemProps {
  item: ShoppingItemType;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ShoppingItemCard({ item, onToggle, onRemove }: ShoppingItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`bg-surface rounded-xl p-3 flex items-center gap-3 ${
        item.checked ? "opacity-50" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
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

      {/* Category color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
      />

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
        className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
