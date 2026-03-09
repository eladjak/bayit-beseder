"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useShoppingList, CATEGORY_COLORS } from "@/hooks/useShoppingList";
import type { ShoppingCategory } from "@/hooks/useShoppingList";
import { ShoppingItemCard } from "@/components/shopping/shopping-item";
import { haptic } from "@/lib/haptics";

const ALL_CATEGORIES: ShoppingCategory[] = ["מזון", "ניקיון", "חיות", "בית", "אחר"];
const FILTER_OPTIONS: Array<ShoppingCategory | "הכל"> = ["הכל", ...ALL_CATEGORIES];

export default function ShoppingPage() {
  const { items, loading, addItem, toggleItem, removeItem, clearChecked } =
    useShoppingList();

  const [filter, setFilter] = useState<ShoppingCategory | "הכל">("הכל");
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<ShoppingCategory>("מזון");
  const [showChecked, setShowChecked] = useState(true);

  const filteredItems = useMemo(() => {
    const filtered =
      filter === "הכל" ? items : items.filter((i) => i.category === filter);
    const unchecked = filtered
      .filter((i) => !i.checked)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    const checked = filtered
      .filter((i) => i.checked)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    return { unchecked, checked };
  }, [items, filter]);

  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.checked).length;

  function handleAdd() {
    if (!newTitle.trim()) return;
    addItem(newTitle.trim(), newCategory);
    haptic("success");
    toast.success("הפריט נוסף לרשימה");
    setNewTitle("");
    setShowForm(false);
  }

  function handleToggle(id: string) {
    haptic("tap");
    toggleItem(id);
    // No toast for toggle - too noisy
  }

  function handleRemove(id: string) {
    haptic("tap");
    removeItem(id);
    toast.info("הפריט הוסר מהרשימה");
  }

  function handleClearChecked() {
    const count = items.filter((i) => i.checked).length;
    if (count === 0) return;
    haptic("success");
    clearChecked();
    toast.success(`${count} פריטים נוקו מהרשימה`);
  }

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-3" dir="rtl">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface rounded-xl p-3 h-12 shimmer"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header with gradient */}
      <div className="gradient-hero mesh-overlay rounded-b-[2rem] px-4 pt-6 pb-5 text-center overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-xl font-bold text-white tracking-tight">
            רשימת קניות
          </h1>
          {totalCount > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/10">
              <span className="text-xs text-white/90 font-medium">
                {checkedCount}/{totalCount} פריטים סומנו
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4">
      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {FILTER_OPTIONS.map((cat) => {
          const isActive = filter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? "gradient-primary text-white shadow-md shadow-primary/20"
                  : "bg-surface text-muted hover:text-foreground card-elevated"
              }`}
              style={
                !isActive && cat !== "הכל"
                  ? { borderRight: `3px solid ${CATEGORY_COLORS[cat]}` }
                  : undefined
              }
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Unchecked items */}
      {filteredItems.unchecked.length === 0 &&
        filteredItems.checked.length === 0 && (
          <motion.div
            className="card-elevated p-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <span className="text-4xl mb-3 block">🛒</span>
            <p className="font-medium text-foreground">הרשימה ריקה!</p>
            <p className="text-sm text-muted mt-1">הוסיפו פריט ראשון</p>
          </motion.div>
        )}

      <AnimatePresence mode="popLayout">
        {filteredItems.unchecked.map((item) => (
          <ShoppingItemCard
            key={item.id}
            item={item}
            onToggle={handleToggle}
            onRemove={handleRemove}
          />
        ))}
      </AnimatePresence>

      {/* Checked items section */}
      {filteredItems.checked.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowChecked((prev) => !prev)}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            {showChecked ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span>
              סומנו ({filteredItems.checked.length})
            </span>
          </button>

          <AnimatePresence>
            {showChecked && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 overflow-hidden"
              >
                <AnimatePresence mode="popLayout">
                  {filteredItems.checked.map((item) => (
                    <ShoppingItemCard
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onRemove={handleRemove}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Clear checked button */}
      {checkedCount > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleClearChecked}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-danger/10 text-danger text-sm font-medium hover:bg-danger/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          נקו פריטים מסומנים ({checkedCount})
        </motion.button>
      )}

      {/* Add item form (slide up) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="card-elevated p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">
                פריט חדש
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg text-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="הוסיפו פריט..."
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
            <div className="flex gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNewCategory(cat)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    newCategory === cat
                      ? "text-white"
                      : "bg-surface-hover text-muted"
                  }`}
                  style={
                    newCategory === cat
                      ? { backgroundColor: CATEGORY_COLORS[cat] }
                      : undefined
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="w-full py-2.5 rounded-xl gradient-primary text-white font-medium text-sm disabled:opacity-40 transition-opacity shadow-md shadow-primary/20"
            >
              הוסיפו
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating add button */}
      {!showForm && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            haptic("tap");
            setShowForm(true);
          }}
          className="fixed bottom-24 left-4 w-13 h-13 rounded-2xl gradient-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center z-20 border border-white/20"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}
      </div>
    </div>
  );
}
