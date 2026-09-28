"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const STORAGE_PREFIX = "bayit-settings-open-";

function readStoredOpen(id: string, defaultOpen: boolean): boolean {
  if (typeof window === "undefined") return defaultOpen;
  try {
    const stored = window.localStorage.getItem(STORAGE_PREFIX + id);
    if (stored === null) return defaultOpen;
    return stored === "1";
  } catch {
    return defaultOpen;
  }
}

function writeStoredOpen(id: string, open: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + id, open ? "1" : "0");
  } catch {
    // localStorage unavailable (private mode etc.) — section still works, just doesn't persist.
  }
}

export interface CollapsibleSectionProps {
  /** Stable, unique id — used for the localStorage key, the anchor hash and aria-controls. */
  id: string;
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional badge rendered at the end of the header row (e.g. a count). */
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Accessible disclosure section for the settings screen (and anywhere else a
 * long list of cards needs to fold away). Real <button> with aria-expanded,
 * fully keyboard operable, and remembers per-section open/closed state in
 * localStorage so a section the user opened stays open next visit.
 *
 * If the page loads with a URL hash matching `#<id>`, the section forces
 * itself open and scrolls into view — several settings sub-sections are
 * linked to from elsewhere in the app (e.g. /settings#pets) and must not be
 * hidden behind a collapsed header when the user arrives that way.
 */
export function CollapsibleSection({
  id,
  icon,
  title,
  subtitle,
  badge,
  defaultOpen = false,
  className = "",
  children,
}: CollapsibleSectionProps) {
  const contentId = useId();
  const rootRef = useRef<HTMLElement>(null);

  // Deliberately NOT a lazy useState initializer. This component is
  // server-rendered (the settings page itself is a static/prerendered
  // route), so the server always renders `defaultOpen` — it has no
  // localStorage to read. If the client's first render read localStorage
  // synchronously, an already-toggled section would come back open on the
  // client while the server-rendered HTML said closed (or vice versa),
  // which is a hydration mismatch — caught by hand while testing this
  // exact component (React logged a "hidden" attribute mismatch on
  // reload). So: render `defaultOpen` on both the server and the client's
  // first pass, then sync from storage — and honor a `#<id>` deep link —
  // in an effect straight after mount.
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.location.hash === `#${id}`) {
      // A deep link always wins over the remembered state.
      setOpen(true);
      requestAnimationFrame(() => {
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    const stored = readStoredOpen(id, defaultOpen);
    if (stored !== defaultOpen) setOpen(stored);
    // Only ever run once, right after mount — this syncs the initial
    // client/server mismatch and checks for a one-shot deep link; it is not
    // meant to react to `id`/`defaultOpen` changing later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      writeStoredOpen(id, next);
      return next;
    });
  }

  return (
    <section id={id} ref={rootRef} className={`card-elevated overflow-hidden scroll-mt-20 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full flex items-center gap-3 p-4 text-start active:bg-surface-hover transition-colors"
      >
        {icon && <span className="text-muted shrink-0" aria-hidden="true">{icon}</span>}
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-sm text-foreground">{title}</span>
          {subtitle && <span className="block text-xs text-muted mt-0.5">{subtitle}</span>}
        </span>
        {badge}
        <ChevronDown
          className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <div id={contentId} hidden={!open} className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
        {children}
      </div>
    </section>
  );
}
