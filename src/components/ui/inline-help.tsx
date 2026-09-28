"use client";

import { useId, useState } from "react";
import { HelpCircle } from "lucide-react";

interface InlineHelpProps {
  /** The explanation shown when the info icon is activated. */
  text: string;
  /** Accessible label for the toggle button, e.g. "מה זה כלל הזהב?" */
  label: string;
  className?: string;
}

/**
 * Small "what does this mean?" affordance for a control whose purpose isn't
 * obvious from its label alone. A real <button> so it works with keyboard and
 * touch (a hover-only tooltip is invisible on mobile, which is most of this
 * app's traffic) — tap/click toggles the explanation inline, right under the
 * control it describes.
 */
export function InlineHelp({ text, label, className = "" }: InlineHelpProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        aria-label={label}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-muted hover:text-primary hover:bg-primary/10 transition-colors -my-0.5"
      >
        <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      {open && (
        <p id={contentId} className="text-[11px] text-muted leading-relaxed mt-1.5 bg-surface-hover rounded-lg px-2.5 py-2">
          {text}
        </p>
      )}
    </span>
  );
}
