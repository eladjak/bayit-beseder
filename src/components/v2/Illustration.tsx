"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { ILLUSTRATIONS, type IllustrationId } from "@/lib/illustrations";

type IllustrationProps = {
  id: IllustrationId;
  sizes: string;
  priority?: boolean;
  /** Only use when adjacent text already conveys the image's meaning. */
  decorative?: boolean;
};

export function Illustration({ id, sizes, priority = false, decorative = false }: IllustrationProps) {
  const { locale } = useTranslation();
  const item = ILLUSTRATIONS[id];
  return (
    // These are already optimized, local WebP files with explicit responsive variants.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.src960}
      srcSet={`${item.src480} 480w, ${item.src960} 960w`}
      sizes={sizes}
      width={item.width}
      height={item.height}
      alt={decorative ? "" : item.alt[locale === "en" ? "en" : "he"]}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
}
