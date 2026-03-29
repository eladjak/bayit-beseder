"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { TASK_TEMPLATES, type TaskTemplate } from "@/lib/task-templates";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

interface TaskTemplatePicker {
  open: boolean;
  onClose: () => void;
  onAddTasks: (template: TaskTemplate) => Promise<void>;
}

export function TaskTemplatePicker({ open, onClose, onAddTasks }: TaskTemplatePicker) {
  const { t } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(async () => {
    if (!selectedTemplate) return;
    setAdding(true);
    try {
      await onAddTasks(selectedTemplate);
      toast.success(t("templates.addedToast").replace("{n}", String(selectedTemplate.tasks.length)).replace("{name}", selectedTemplate.name));
      onClose();
      setSelectedTemplate(null);
    } catch {
      toast.error(t("templates.addError"));
    } finally {
      setAdding(false);
    }
  }, [selectedTemplate, onAddTasks, onClose, t]);

  const handleClose = () => {
    if (adding) return;
    onClose();
    setSelectedTemplate(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-2xl max-w-lg mx-auto"
            style={{ maxHeight: "85dvh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground">{t("templates.title")}</h2>
                <p className="text-xs text-muted mt-0.5">{t("templates.subtitle")}</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-surface-hover transition-colors"
                aria-label={t("common.close")}
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "calc(85dvh - 120px)" }}>
              <div className="p-4 space-y-3" dir="rtl">
                {/* Template list */}
                {!selectedTemplate ? (
                  TASK_TEMPLATES.map((template) => (
                    <motion.button
                      key={template.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedTemplate(template)}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-surface hover:bg-surface-hover transition-colors text-right"
                    >
                      <span className="text-2xl shrink-0">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{template.name}</p>
                        <p className="text-xs text-muted mt-0.5">{template.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {template.tasks.length} {t("templates.taskCount")}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted rotate-180" />
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3"
                  >
                    {/* Back button */}
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium"
                    >
                      <ChevronRight className="w-4 h-4" />
                      {t("templates.backToList")}
                    </button>

                    {/* Template header */}
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                      <span className="text-3xl">{selectedTemplate.icon}</span>
                      <div>
                        <p className="font-bold text-foreground">{selectedTemplate.name}</p>
                        <p className="text-xs text-muted">{selectedTemplate.description}</p>
                      </div>
                    </div>

                    {/* Task preview */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted px-1">{t("templates.taskPreview")}</p>
                      {selectedTemplate.tasks.map((task, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface border border-border"
                        >
                          <CheckCircle2 className="w-4 h-4 text-muted shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground font-medium truncate">{task.title}</p>
                          </div>
                          <span className="text-[10px] text-muted shrink-0">{task.minutes} {t("templates.minutes")}</span>
                        </div>
                      ))}
                    </div>

                    {/* Add button */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAdd}
                      disabled={adding}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl gradient-primary text-white font-semibold text-sm shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {adding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="text-base">{selectedTemplate.icon}</span>
                      )}
                      {adding ? t("templates.adding") : t("templates.addAll").replace("{n}", String(selectedTemplate.tasks.length))}
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
