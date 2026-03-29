"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Check } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface TaskPhotoCaptureProps {
  onPhotoSelected: (file: File) => void;
  onCancel: () => void;
}

/**
 * Inline camera / file-picker with preview thumbnail.
 * Renders a native file input with `capture="environment"` for mobile cameras.
 */
export function TaskPhotoCapture({ onPhotoSelected, onCancel }: TaskPhotoCaptureProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function handleConfirm() {
    if (!selectedFile) return;
    onPhotoSelected(selectedFile);
    if (preview) URL.revokeObjectURL(preview);
  }

  function handleCancel() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    onCancel();
  }

  return (
    <AnimatePresence mode="wait">
      {!preview ? (
        <motion.div
          key="picker"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-medium border border-primary/20 hover:bg-primary/15 transition-colors active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            {t("tasks.photo.addPhoto")}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-lg text-muted hover:text-foreground transition-colors"
            aria-label={t("common.cancel")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {/* Hidden file input — capture="environment" opens rear camera on mobile */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
            aria-label={t("tasks.photo.addPhoto")}
          />
        </motion.div>
      ) : (
        <motion.div
          key="preview"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex items-center gap-2"
        >
          {/* Thumbnail preview */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-primary/30 flex-shrink-0">
            <Image
              src={preview}
              alt={t("tasks.photo.preview")}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          {/* Confirm */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl gradient-primary text-white text-xs font-semibold shadow-sm shadow-primary/30 active:scale-95 transition-transform"
          >
            <Check className="w-3.5 h-3.5" />
            {t("tasks.photo.confirm")}
          </button>
          {/* Cancel */}
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-lg text-muted hover:text-foreground transition-colors"
            aria-label={t("common.cancel")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
