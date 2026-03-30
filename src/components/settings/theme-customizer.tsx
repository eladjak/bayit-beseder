"use client";

import { Check, Palette } from "lucide-react";
import { useThemeColor, THEME_COLORS, type ThemeColorKey } from "@/hooks/useThemeColor";
import { useTranslation } from "@/hooks/useTranslation";

export function ThemeCustomizer() {
  const { t, locale } = useTranslation();
  const { currentColor, setColor } = useThemeColor();

  const colorKeys = Object.keys(THEME_COLORS) as ThemeColorKey[];

  return (
    <section className="card-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-sm">{t("settings.themeCustomizer.title")}</h2>
      </div>
      <p className="text-xs text-muted">{t("settings.themeCustomizer.description")}</p>
      <div className="flex gap-3 flex-wrap">
        {colorKeys.map((key) => {
          const color = THEME_COLORS[key];
          const isActive = currentColor === key;
          const name = locale === "en" ? color.nameEn : color.nameHe;

          return (
            <button
              key={key}
              onClick={() => setColor(key)}
              title={name}
              aria-label={name}
              aria-pressed={isActive}
              className="relative w-9 h-9 rounded-full shadow-sm transition-transform active:scale-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: color.primary,
                boxShadow: isActive
                  ? `0 0 0 3px white, 0 0 0 5px ${color.primary}`
                  : undefined,
              }}
            >
              {isActive && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white drop-shadow-sm" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted">
        {THEME_COLORS[currentColor][locale === "en" ? "nameEn" : "nameHe"]}
      </p>
    </section>
  );
}
