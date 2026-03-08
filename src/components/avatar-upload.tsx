"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadAvatar } from "@/lib/storage";
import { toast } from "sonner";

interface AvatarUploadProps {
  currentUrl: string | null;
  userId: string | null;
  displayName: string;
  onUploaded: (url: string) => void;
}

export function AvatarUpload({
  currentUrl,
  userId,
  displayName,
  onUploaded,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    if (!userId) {
      toast.info("יש להתחבר כדי להעלות תמונה");
      return;
    }
    fileInputRef.current?.click();
  }, [userId]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !userId) return;

      // Show preview immediately
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      setUploading(true);

      const result = await uploadAvatar(userId, file);

      if ("error" in result) {
        toast.error(result.error);
        setPreviewUrl(null);
      } else {
        toast.success("התמונה עודכנה בהצלחה!");
        onUploaded(result.url);
        // Keep preview until parent updates
      }

      setUploading(false);
      URL.revokeObjectURL(localPreview);

      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [userId, onUploaded]
  );

  const displayUrl = previewUrl ?? currentUrl;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={uploading}
        className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden group disabled:opacity-70"
        aria-label="שינוי תמונת פרופיל"
      >
        <AnimatePresence mode="wait">
          {displayUrl ? (
            <motion.img
              key={displayUrl}
              src={displayUrl}
              alt="תמונת פרופיל"
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            />
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <User className="w-8 h-8 text-primary" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Upload progress ring */}
        {uploading && (
          <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {displayName || "משתמש"}
        </p>
        <p className="text-xs text-muted">
          {uploading ? "מעלה תמונה..." : "לחצו לשינוי תמונה"}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
