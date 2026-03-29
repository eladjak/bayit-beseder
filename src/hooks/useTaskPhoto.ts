"use client";

import { useCallback } from "react";
import { useSupabase } from "@/components/SupabaseProvider";

export function useTaskPhoto() {
  const supabase = useSupabase();

  /**
   * Upload a photo file to the "task-photos" Supabase Storage bucket.
   * Returns the public URL on success, or null on failure.
   *
   * NOTE: The "task-photos" bucket must be created manually in the Supabase dashboard
   * with Public access enabled (or a suitable RLS policy for authenticated reads).
   */
  const uploadPhoto = useCallback(
    async (file: File, taskId: string): Promise<string | null> => {
      try {
        // Normalise to JPEG-like extension (mobile captures often return image/jpeg)
        const ext = file.type === "image/png" ? "png" : "jpg";
        const fileName = `${taskId}-${Date.now()}.${ext}`;

        const { error } = await supabase.storage
          .from("task-photos")
          .upload(fileName, file, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });

        if (error) {
          console.error("Photo upload failed:", error.message);
          return null;
        }

        const { data: urlData } = supabase.storage
          .from("task-photos")
          .getPublicUrl(fileName);

        return urlData.publicUrl ?? null;
      } catch (err) {
        console.error("Unexpected photo upload error:", err);
        return null;
      }
    },
    [supabase]
  );

  return { uploadPhoto };
}
