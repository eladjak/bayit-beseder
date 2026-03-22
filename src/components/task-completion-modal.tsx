"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Camera, X, Send, Loader2 } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface TaskCompletionModalProps {
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: {
    rating: number;
    notes: string;
    photoFile: File | null;
  }) => Promise<void>;
}

export function TaskCompletionModal({
  taskTitle,
  isOpen,
  onClose,
  onSubmit,
}: TaskCompletionModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleStarClick = useCallback((star: number) => {
    setRating(star);
    haptic("tap");
  }, []);

  const handlePhotoSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    },
    []
  );

  const handleRemovePhoto = useCallback(() => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  }, [photoPreview]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    haptic("success");
    await onSubmit({ rating, notes, photoFile });
    // Reset state
    setRating(0);
    setNotes("");
    handleRemovePhoto();
    setSubmitting(false);
  }, [rating, notes, photoFile, onSubmit, handleRemovePhoto]);

  const handleSkip = useCallback(() => {
    setRating(0);
    setNotes("");
    handleRemovePhoto();
    onClose();
  }, [onClose, handleRemovePhoto]);

  const ratingLabels = ["", "גרוע", "לא טוב", "סביר", "טוב", "מעולה!"];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleSkip}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`משוב על משימה: ${taskTitle}`}
            className="relative w-full max-w-lg bg-background dark:bg-surface rounded-t-3xl p-5 pb-8 space-y-4"
            dir="rtl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-1 rounded-full text-muted hover:text-foreground transition-colors"
              aria-label="סגירה"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="text-center pt-1">
              <p className="text-xs text-muted mb-1">השלמתם את</p>
              <p className="font-semibold text-foreground">{taskTitle}</p>
            </div>

            {/* Star Rating */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted">איך היה?</p>
              <div
                className="flex justify-center gap-1.5"
                role="radiogroup"
                aria-label="דירוג המשימה"
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled =
                    star <= (hoveredStar > 0 ? hoveredStar : rating);
                  return (
                    <motion.button
                      key={star}
                      role="radio"
                      aria-checked={rating === star}
                      tabIndex={rating === star || (rating === 0 && star === 1) ? 0 : -1}
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                          e.preventDefault();
                          const next = Math.max(1, star - 1);
                          handleStarClick(next);
                        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                          e.preventDefault();
                          const next = Math.min(5, star + 1);
                          handleStarClick(next);
                        } else if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleStarClick(star);
                        }
                      }}
                      whileTap={{ scale: 1.3 }}
                      className="p-1"
                      aria-label={`דירוג ${star} כוכבים`}
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          isFilled
                            ? "fill-amber-400 text-amber-400"
                            : "text-border fill-transparent"
                        }`}
                      />
                    </motion.button>
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                {(hoveredStar > 0 || rating > 0) && (
                  <motion.p
                    key={hoveredStar || rating}
                    className="text-xs text-primary font-medium"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15 }}
                  >
                    {ratingLabels[hoveredStar || rating]}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Notes */}
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות (אופציונלי)..."
                rows={2}
                className="w-full bg-background dark:bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Photo */}
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="תמונת משימה"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center"
                    aria-label="הסרת תמונה"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-muted text-sm cursor-pointer hover:border-primary hover:text-primary transition-colors">
                  <Camera className="w-4 h-4" />
                  <span>הוספת תמונה</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSkip}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted hover:bg-surface-hover transition-colors"
              >
                דלג
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 gradient-primary text-white rounded-xl text-sm font-medium shadow-md shadow-primary/20 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? "שומר..." : "שמירה"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
