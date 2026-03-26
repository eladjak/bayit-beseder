"use client";

import { useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronDown, ChevronUp, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useShoppingList, CATEGORY_COLORS, SHOPPING_CATEGORY_ICONS } from "@/hooks/useShoppingList";
import type { ShoppingCategory, ShoppingItem } from "@/hooks/useShoppingList";
import { useShoppingCategories } from "@/hooks/useShoppingCategories";
import { ShoppingItemCard } from "@/components/shopping/shopping-item";
import { CategoryManager } from "@/components/shopping/category-manager";
import { haptic } from "@/lib/haptics";
import { useSeasonalMode } from "@/hooks/useSeasonalMode";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/hooks/useTranslation";
import { Loader2 } from "lucide-react";

const VIRTUALIZE_THRESHOLD = 10;
const ITEM_HEIGHT = 52; // px — estimated height of each ShoppingItemCard + gap
const ITEM_GAP = 6; // px — space-y-1.5 = 6px
const OVERSCAN = 3;

interface VirtualizedItemsProps {
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  categoryColor: string;
  categoryIcon: string;
}

function VirtualizedCategoryItems({
  items,
  onToggle,
  onRemove,
  categoryColor,
  categoryIcon,
}: VirtualizedItemsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ITEM_HEIGHT + ITEM_GAP,
    overscan: OVERSCAN,
  });

  const totalHeight = rowVirtualizer.getTotalSize();

  return (
    <div
      ref={containerRef}
      // Cap visible area so the container becomes scrollable when item count is large
      style={{ maxHeight: Math.min(totalHeight, 8 * (ITEM_HEIGHT + ITEM_GAP)), overflowY: "auto" }}
      className="p-2"
      aria-label={`${items.length} פריטים`}
    >
      {/* Spacer that sets the full virtual height */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={item.id}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                left: 0,
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: ITEM_GAP,
              }}
            >
              <ShoppingItemCard
                item={item}
                onToggle={onToggle}
                onRemove={onRemove}
                categoryColor={categoryColor}
                categoryIcon={categoryIcon}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const VoiceInputButton = dynamic(
  () => import("@/components/voice-input-button").then((m) => m.VoiceInputButton),
  { ssr: false }
);

export default function ShoppingPage() {
  const { items, loading, addItem, toggleItem, removeItem, clearChecked } =
    useShoppingList();
  const {
    categories: dynamicCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  } = useShoppingCategories();
  const seasonalMode = useSeasonalMode();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const [addingSeasonalShopping, setAddingSeasonalShopping] = useState(false);

  // Add-item form state
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<ShoppingCategory>("שונות");
  // Which category section triggered the add form (pre-selects category)
  const [formPresetCategory, setFormPresetCategory] = useState<string | null>(null);

  // Collapsed state per category name
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Build icon/color maps from dynamic categories (with fallback to static maps)
  const categoryIconMap = useMemo(() => {
    const map: Record<string, string> = { ...SHOPPING_CATEGORY_ICONS };
    for (const c of dynamicCategories) {
      map[c.name] = c.icon;
    }
    return map;
  }, [dynamicCategories]);

  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = { ...CATEGORY_COLORS };
    for (const c of dynamicCategories) {
      map[c.name] = c.color;
    }
    return map;
  }, [dynamicCategories]);

  // Ordered category names from dynamic categories
  const orderedCategoryNames = useMemo(() => {
    if (dynamicCategories.length > 0) {
      return dynamicCategories.map((c) => c.name);
    }
    return Object.keys(SHOPPING_CATEGORY_ICONS);
  }, [dynamicCategories]);

  // Group items by category, keeping category order from orderedCategoryNames
  const groupedItems = useMemo(() => {
    const groups: { categoryName: string; items: typeof items }[] = [];

    // Categories in defined order that actually have items
    const categoriesWithItems = new Set(items.map((i) => i.category));

    for (const catName of orderedCategoryNames) {
      if (!categoriesWithItems.has(catName)) continue;
      const catItems = items.filter((i) => i.category === catName);
      // Sort: unchecked first (by creation date desc), then checked (by creation date desc)
      const unchecked = catItems
        .filter((i) => !i.checked)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const checked = catItems
        .filter((i) => i.checked)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      groups.push({ categoryName: catName, items: [...unchecked, ...checked] });
    }

    // Any items in categories not in orderedCategoryNames go to a fallback group
    const knownCatNames = new Set(orderedCategoryNames);
    const unknownItems = items.filter((i) => !knownCatNames.has(i.category));
    if (unknownItems.length > 0) {
      groups.push({ categoryName: "שונות", items: unknownItems });
    }

    return groups;
  }, [items, orderedCategoryNames]);

  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.checked).length;

  function toggleCollapse(categoryName: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  }

  function openAddForm(presetCategory?: string) {
    haptic("tap");
    const cat = presetCategory ?? orderedCategoryNames[orderedCategoryNames.length - 1] ?? "שונות";
    setNewCategory(cat);
    setFormPresetCategory(presetCategory ?? null);
    setShowForm(true);
  }

  function handleAdd() {
    if (!newTitle.trim()) return;
    addItem(newTitle.trim(), newCategory);
    haptic("success");
    toast.success(t("shopping.itemAdded"));
    setNewTitle("");
    setShowForm(false);
    setFormPresetCategory(null);
  }

  function handleToggle(id: string) {
    haptic("tap");
    toggleItem(id);
  }

  function handleRemove(id: string) {
    haptic("tap");
    removeItem(id);
    toast.info(t("shopping.itemRemoved"));
  }

  function handleClearChecked() {
    const count = items.filter((i) => i.checked).length;
    if (count === 0) return;
    haptic("success");
    clearChecked();
    toast.success(`${count} ${t("shopping.itemsCleared")}`);
  }

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-3" dir="rtl">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl p-3 h-12 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28" dir="rtl">
      {/* Header with gradient */}
      <div className="gradient-hero mesh-overlay rounded-b-[2rem] px-4 pt-6 pb-5 overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold text-white tracking-tight">
              🛒 {t("shopping.titleShort")}
            </h1>
            {totalCount > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/10">
                <span className="text-xs text-white/90 font-medium">
                  {checkedCount}/{totalCount} {t("shopping.inCart")}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Clear checked */}
            {checkedCount > 0 && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileTap={{ scale: 0.88 }}
                onClick={handleClearChecked}
                aria-label={t("shopping.clearChecked")}
                className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition-colors border border-white/10"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
            {/* Category manager */}
            <button
              onClick={() => setShowCategoryManager(true)}
              className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white transition-all duration-100 active:scale-[0.90] border border-white/10"
              aria-label={t("shopping.manageCategories")}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* ---- Pesach shopping button ---- */}
        {seasonalMode.activation && !seasonalMode.activation.shoppingAdded && profile?.household_id && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={async () => {
              if (!profile?.household_id || !profile?.id) return;
              setAddingSeasonalShopping(true);
              const result = await seasonalMode.addShoppingItems(profile.household_id, profile.id);
              setAddingSeasonalShopping(false);
              if (result.added > 0) {
                toast.success(`${result.added} ${t("shopping.pesachItemsAdded")}`);
              } else if (result.errors.length > 0) {
                toast.error(t("shopping.pesachAddError"));
              }
            }}
            disabled={addingSeasonalShopping}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm shadow-lg disabled:opacity-60 transition-opacity"
            style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}
          >
            {addingSeasonalShopping ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              t("shopping.pesachShopping")
            )}
          </motion.button>
        )}

        {/* ---- Empty state ---- */}
        {items.length === 0 && (
          <motion.div
            className="card-elevated p-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Image
              src="/illustrations/empty-shopping.jpg"
              alt="רשימת קניות ריקה"
              width={192}
              height={192}
              className="w-48 h-48 mx-auto object-cover rounded-2xl mb-3"
            />
            <p className="font-medium text-foreground">{t("shopping.emptyTitle")}</p>
            <p className="text-sm text-muted mt-1">{t("shopping.emptySubtitle")}</p>
            <button
              onClick={() => openAddForm()}
              className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold shadow-md shadow-primary/25 active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" />
              {t("shopping.addFirstItem")}
            </button>
          </motion.div>
        )}

        {/* ---- Grouped category sections ---- */}
        <AnimatePresence initial={false}>
          {groupedItems.map(({ categoryName, items: catItems }) => {
            const isCollapsed = collapsedCategories.has(categoryName);
            const color = categoryColorMap[categoryName] ?? "#6B7280";
            const icon = categoryIconMap[categoryName] ?? "📦";
            const checkedInCat = catItems.filter((i) => i.checked).length;
            const totalInCat = catItems.length;

            return (
              <motion.div
                key={categoryName}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="card-elevated overflow-hidden"
              >
                {/* Category header */}
                <div
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none hover:bg-surface-hover transition-colors duration-150 active:bg-border/20"
                  onClick={() => toggleCollapse(categoryName)}
                  role="button"
                  aria-expanded={!isCollapsed}
                  aria-label={`${categoryName} - ${totalInCat} ${t("shopping.items")}`}
                >
                  {/* Color dot + icon */}
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: `${color}22` }}
                    aria-hidden
                  >
                    {icon}
                  </span>

                  {/* Category name */}
                  <span className="flex-1 text-sm font-semibold text-foreground">
                    {categoryName}
                  </span>

                  {/* Item count badge */}
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}22`, color }}>
                    {checkedInCat > 0 ? `${checkedInCat}/${totalInCat}` : totalInCat}
                  </span>

                  {/* Add to this category button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddForm(categoryName);
                    }}
                    aria-label={`${t("shopping.addToCategory")}${categoryName}`}
                    className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-all duration-100 active:scale-[0.85]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* Collapse chevron */}
                  <span className="text-muted" aria-hidden>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </span>
                </div>

                {/* Colored divider line */}
                <div className="h-px mx-3" style={{ backgroundColor: `${color}40` }} />

                {/* Items list */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "tween", duration: 0.18, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      {catItems.length >= VIRTUALIZE_THRESHOLD ? (
                        // Large category: virtualize items to keep rendering fast
                        <VirtualizedCategoryItems
                          items={catItems}
                          onToggle={handleToggle}
                          onRemove={handleRemove}
                          categoryColor={color}
                          categoryIcon={icon}
                        />
                      ) : (
                        // Small category: normal animated rendering
                        <div className="p-2 space-y-1.5">
                          <AnimatePresence mode="popLayout">
                            {catItems.map((item) => (
                              <ShoppingItemCard
                                key={item.id}
                                item={item}
                                onToggle={handleToggle}
                                onRemove={handleRemove}
                                categoryColor={color}
                                categoryIcon={icon}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Manage categories link */}
        <button
          onClick={() => setShowCategoryManager(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-muted text-sm font-medium hover:border-primary hover:text-primary transition-all duration-100 active:scale-[0.98]"
        >
          <Settings className="w-4 h-4" />
          {t("shopping.editCategories")}
        </button>
      </div>

      {/* ---- Add item form (bottom sheet style) ---- */}
      <AnimatePresence>
        {showForm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-surface rounded-t-2xl px-4 pt-4 pb-10 shadow-xl max-w-lg mx-auto"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">
                  {formPresetCategory ? `➕ ${t("shopping.addToCategory")}${formPresetCategory}` : t("shopping.whatsMissing")}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  aria-label={t("shopping.closeForm")}
                  className="p-1 rounded-lg text-muted hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                  placeholder={t("shopping.whatToBuy")}
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />
                <VoiceInputButton
                  onTranscript={(text) => setNewTitle(text)}
                  ariaLabel={t("shopping.addByVoice")}
                  className="flex-shrink-0 w-8 h-8"
                />
              </div>

              {/* Category selector */}
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                {orderedCategoryNames.map((cat) => {
                  const catColor = categoryColorMap[cat] ?? "#6B7280";
                  const catIcon = categoryIconMap[cat] ?? "📦";
                  const isSelected = newCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setNewCategory(cat)}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isSelected ? "text-white" : "bg-surface-hover text-muted"
                      }`}
                      style={isSelected ? { backgroundColor: catColor } : undefined}
                    >
                      <span>{catIcon}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleAdd}
                disabled={!newTitle.trim()}
                className="w-full py-2.5 rounded-2xl gradient-primary text-white font-semibold text-sm disabled:opacity-40 transition-all duration-100 active:scale-[0.97] shadow-md shadow-primary/20"
              >
                {t("shopping.addToList")}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating add button */}
      {!showForm && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => openAddForm()}
          aria-label={t("shopping.addItem")}
          className="fixed bottom-24 left-4 w-14 h-14 rounded-2xl gradient-primary text-white shadow-xl shadow-primary/40 flex items-center justify-center z-20 border border-white/20"
        >
          <Plus className="w-7 h-7" />
        </motion.button>
      )}

      {/* Category Manager Modal */}
      <AnimatePresence>
        {showCategoryManager && (
          <CategoryManager
            categories={dynamicCategories}
            onAdd={addCategory}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
            onReorder={reorderCategories}
            onClose={() => setShowCategoryManager(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
