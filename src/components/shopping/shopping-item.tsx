"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2, Pencil, Minus, Plus, ArrowRightLeft } from "lucide-react";
import type { ShoppingItem as ShoppingItemType } from "@/hooks/useShoppingList";
import { CATEGORY_COLORS, SHOPPING_CATEGORY_ICONS } from "@/hooks/useShoppingList";

interface ShoppingItemProps {
  item: ShoppingItemType;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit?: (id: string, updates: { title?: string; quantity?: number; category?: string }) => void;
  onMoveCategory?: (id: string) => void;
  /** Override color for the left border */
  categoryColor?: string;
  /** Override icon for the item */
  categoryIcon?: string;
  /** Emoji to display (from autocomplete) */
  itemEmoji?: string;
}

export const ShoppingItemCard = memo(function ShoppingItemCard({
  item,
  onToggle,
  onRemove,
  onEdit,
  onMoveCategory,
  categoryColor,
  categoryIcon,
  itemEmoji,
}: ShoppingItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const borderColor = item.checked
    ? "var(--color-success)"
    : (categoryColor ?? CATEGORY_COLORS[item.category] ?? "#6B7280");

  const icon = itemEmoji ?? categoryIcon ?? SHOPPING_CATEGORY_ICONS[item.category] ?? "📦";

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== item.title && onEdit) {
      onEdit(item.id, { title: trimmed });
    }
    setIsEditing(false);
  }, [editTitle, item.id, item.title, onEdit]);

  const handleQuantityChange = useCallback((delta: number) => {
    const newQty = Math.max(1, (item.quantity ?? 1) + delta);
    onEdit?.(item.id, { quantity: newQty });
  }, [item.id, item.quantity, onEdit]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
      whileTap={isEditing ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`card-elevated p-3 flex items-center gap-2.5 relative overflow-hidden hover:shadow-md transition-shadow duration-150 ${
        item.checked ? "opacity-50" : ""
      }`}
      style={{ borderInlineStart: `3px solid ${borderColor}` }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        aria-label={item.checked ? `בטל סימון: ${item.title}` : `סמן כנרכש: ${item.title}`}
        aria-pressed={item.checked}
        className="w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-100 active:scale-[0.85]"
        style={{
          borderColor: item.checked ? "var(--color-success)" : "var(--color-border)",
          backgroundColor: item.checked ? "var(--color-success)" : "transparent",
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

      {/* Emoji icon */}
      <span className="text-sm flex-shrink-0" aria-hidden>{icon}</span>

      {/* Title — editable on tap */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.input
              key="edit"
              ref={inputRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") { setEditTitle(item.title); setIsEditing(false); }
              }}
              className="w-full text-sm font-medium bg-transparent border-b-2 border-primary outline-none text-foreground py-0.5"
              dir="auto"
            />
          ) : (
            <motion.span
              key="display"
              className="flex-1 text-sm font-medium relative block truncate cursor-pointer"
              onClick={() => { if (onEdit && !item.checked) { setEditTitle(item.title); setIsEditing(true); } }}
            >
              <span className={`transition-colors duration-200 ${item.checked ? "text-muted" : "text-foreground"}`}>
                {item.title}
              </span>
              {item.checked && (
                <motion.span className="absolute inset-y-0 start-0 end-0 flex items-center pointer-events-none" aria-hidden>
                  <motion.span
                    className="block h-px bg-muted w-full"
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    style={{ transformOrigin: "0% 50%" }}
                  />
                </motion.span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Quantity controls */}
      {!item.checked && onEdit && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={(item.quantity ?? 1) <= 1}
            className="w-5 h-5 rounded flex items-center justify-center text-muted hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-30"
            aria-label="הפחת כמות"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-[11px] font-semibold text-muted min-w-[20px] text-center">
            {item.quantity ?? 1}{item.unit ? ` ${item.unit}` : ""}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            className="w-5 h-5 rounded flex items-center justify-center text-muted hover:text-foreground hover:bg-muted/30 transition-colors"
            aria-label="הוסף כמות"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Checked quantity badge (when checked, show simple badge) */}
      {item.checked && item.quantity && item.quantity > 1 && (
        <span className="text-[11px] px-1.5 py-0.5 bg-border/50 rounded-md text-muted font-medium flex-shrink-0">
          x{item.quantity} {item.unit ?? ""}
        </span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* Move to different category */}
        {onMoveCategory && !item.checked && (
          <button
            onClick={() => onMoveCategory(item.id)}
            aria-label="העבר לקטגוריה אחרת"
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Edit button */}
        {onEdit && !item.checked && !isEditing && (
          <button
            onClick={() => { setEditTitle(item.title); setIsEditing(true); }}
            aria-label="ערוך פריט"
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete */}
        <button
          onClick={() => onRemove(item.id)}
          aria-label={`מחיקת פריט: ${item.title}`}
          className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
});
