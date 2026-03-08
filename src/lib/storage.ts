import { createClient } from "@/lib/supabase";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DIMENSION = 400;

/**
 * Compress and resize an image file using canvas.
 * Returns a Blob ready for upload.
 */
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to compress image"));
        },
        "image/webp",
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Upload an avatar image to Supabase Storage and return the public URL.
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return { error: "הקובץ גדול מדי. מקסימום 2MB." };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "יש לבחור קובץ תמונה בלבד." };
  }

  try {
    const compressed = await compressImage(file);
    const fileName = `${userId}/avatar-${Date.now()}.webp`;

    const supabase = createClient();

    // Remove old avatar if exists
    const { data: existingFiles } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(userId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from(AVATAR_BUCKET).remove(filesToRemove);
    }

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, compressed, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      return { error: `שגיאה בהעלאה: ${uploadError.message}` };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(fileName);

    return { url: publicUrl };
  } catch {
    return { error: "שגיאה בעיבוד התמונה. נסו שוב." };
  }
}

/**
 * Upload a task completion photo to Supabase Storage.
 */
export async function uploadTaskPhoto(
  userId: string,
  taskId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return { error: "הקובץ גדול מדי. מקסימום 2MB." };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "יש לבחור קובץ תמונה בלבד." };
  }

  try {
    const compressed = await compressImage(file);
    const fileName = `${userId}/${taskId}-${Date.now()}.webp`;

    const supabase = createClient();

    const { error: uploadError } = await supabase.storage
      .from("task-photos")
      .upload(fileName, compressed, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      // Bucket might not exist - create it via API or fail gracefully
      return { error: `שגיאה בהעלאה: ${uploadError.message}` };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("task-photos").getPublicUrl(fileName);

    return { url: publicUrl };
  } catch {
    return { error: "שגיאה בעיבוד התמונה. נסו שוב." };
  }
}
