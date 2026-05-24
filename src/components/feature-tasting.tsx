"use client";

/**
 * Feature Tasting — Sprint 7.30+ premium teaser.
 *
 * Wraps any locked feature with a blurred preview + lock-overlay + upgrade CTA.
 * "וואלה שווה את זה" — show real value before paywall.
 *
 * Spec: docs/ALOPIK-INTEGRATION-SPEC.md (Elad 24.5 directive)
 */

import { Lock, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  /** Sample/locked content to render blurred behind the lock overlay */
  readonly children: ReactNode;
  /** Headline shown over the lock */
  readonly title: string;
  /** One-line benefit shown under title */
  readonly subtitle?: string;
  /** Up to 3 micro-benefits as bullets */
  readonly benefits?: readonly string[];
  /** CTA label override */
  readonly cta?: string;
  /** CTA href — defaults to /upgrade */
  readonly href?: string;
  /** Height of preview area */
  readonly previewHeight?: string;
  /** Show "טעימה חינם" badge */
  readonly showTeaserBadge?: boolean;
};

export function FeatureTasting({
  children,
  title,
  subtitle,
  benefits,
  cta = "שדרגו ל-Plus 🌟",
  href = "/upgrade",
  previewHeight = "260px",
  showTeaserBadge = true,
}: Props) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-indigo-200/60 dark:border-indigo-800/40 shadow-sm">
      {/* Blurred preview layer */}
      <div
        className="relative overflow-hidden"
        style={{ height: previewHeight }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 select-none pointer-events-none"
          style={{ filter: "blur(6px)", opacity: 0.55, transform: "scale(1.04)" }}
        >
          {children}
        </div>
        {/* Gradient fade bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white dark:to-zinc-900" />
        {/* Top-end teaser badge */}
        {showTeaserBadge && (
          <span className="absolute top-3 end-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-200 shadow-sm">
            <Sparkles className="size-3" aria-hidden="true" />
            טעימה
          </span>
        )}
      </div>

      {/* Reveal overlay */}
      <div className="bg-white dark:bg-zinc-900 px-5 py-5 -mt-px border-t border-indigo-100 dark:border-indigo-900/30">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md">
            <Lock className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 text-pretty">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {benefits && benefits.length > 0 && (
          <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 mb-4 ps-1">
            {benefits.slice(0, 3).map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Sparkles className="size-3.5 text-amber-500 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        <Link
          href={href}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-transform"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          {cta}
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>

        <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mt-2">
          בחינם ל-30 יום · ביטול בכל רגע
        </p>
      </div>
    </div>
  );
}
