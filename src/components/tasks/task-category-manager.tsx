"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Check } from "lucide-react";
import { toast } from "sonner";
import type { TaskCategoryRow } from "@/hooks/useTaskCategories";

const COLOR_OPTIONS = [
  "#F59E0B", "#3B82F6", "#8B5CF6", "#EC4899",
  "#06B6D4", "#84CC16", "#F97316", "#10B981",
  "#EF4444", "#6B7280",
];

const ICON_OPTIONS = [
  "🍳", "🚿", "🛋️", "🛏️", "👕", "🌳", "🐾", "✨",
  "🏠", "🔧", "🧹", "📦", "🎁", "🪴", "🫙", "🪟",
  "🗑️", "🧺", "💡", "🔑",
];

interface TaskCategoryManagerProps {
  categories: TaskCategoryRow[];
  onAdd: (name: string, icon: string, color: string) => Promise<void>;
  onUpdate: (id: string, updates: { name?: string; icon?: string; color?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onClose: () => void;
}

export function TaskCategoryManager({
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  onClose,
}: TaskCategoryManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("✨");
  const [newColor, setNewColor] = useState("#6366f1");

  const startEdit = (cat: TaskCategoryRow) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setEditColor(cat.color);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await onUpdate(editingId, { name: editName.trim(), icon: editIcon, color: editColor });
    setEditingId(null);
    toast.success("הקטגוריה עודכנה");
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await onAdd(newName.trim(), newIcon, newColor);
    setNewName("");
    setNewIcon("✨");
    setNewColor("#6366f1");
    setShowAddForm(false);
    toast.success("קטגוריה חדשה נוספה");
  };

  const handleDelete = async (id: string, name: string) => {
    await onDelete(id);
    toast.success(`הקטגוריה "${name}" נמחקה`);
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const ids = categories.map((c) => c.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await onReorder(ids);
  };

  const moveDown = async (index: number) => {
    if (index === categories.length - 1) return;
    const ids = categories.map((c) => c.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    await onReorder(ids);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-surface rounded-t-2xl p-4 pb-8 max-h-[80vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base text-foreground">ניהול קטגוריות משימות</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-hover text-muted"
            aria-label="סגירה"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category list */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {categories.map((cat, index) => (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-background rounded-xl border border-border p-3"
              >
                {editingId === cat.id ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    {/* Icon picker */}
                    <div className="flex flex-wrap gap-1.5">
                      {ICON_OPTIONS.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setEditIcon(icon)}
                          className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors ${
                            editIcon === icon
                              ? "bg-primary/10 ring-2 ring-primary"
                              : "bg-surface hover:bg-surface-hover"
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    {/* Color picker */}
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          className={`w-7 h-7 rounded-full transition-transform ${
                            editColor === color
                              ? "ring-2 ring-offset-2 ring-offset-surface dark:ring-offset-surface ring-primary scale-110"
                              : ""
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`בחר צבע ${color}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 py-2 rounded-lg gradient-primary text-white text-sm font-medium"
                      >
                        <Check className="w-4 h-4 inline ml-1" />
                        שמור
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg bg-surface text-muted text-sm"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${cat.color}15` }}
                    >
                      {cat.icon}
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-muted disabled:opacity-30"
                        aria-label="הזז למעלה"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === categories.length - 1}
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-muted disabled:opacity-30"
                        aria-label="הזז למטה"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-muted"
                        aria-label="ערוך קטגוריה"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted hover:text-red-500"
                        aria-label="מחק קטגוריה"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add new category */}
        {showAddForm ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-background rounded-xl border border-border p-3 space-y-3"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם הקטגוריה..."
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            {/* Icon picker */}
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors ${
                    newIcon === icon
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "bg-surface hover:bg-surface-hover"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
            {/* Color picker */}
            <div className="flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    newColor === color ? "ring-2 ring-offset-2 ring-offset-surface dark:ring-offset-surface ring-primary scale-110" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`בחר צבע ${color}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="flex-1 py-2 rounded-lg gradient-primary text-white text-sm font-medium disabled:opacity-50"
              >
                <Plus className="w-4 h-4 inline ml-1" />
                הוסף
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg bg-surface text-muted text-sm"
              >
                ביטול
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-muted text-sm font-medium hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
            הוסף קטגוריה חדשה
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
