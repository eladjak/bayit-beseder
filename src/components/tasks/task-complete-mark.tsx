"use client";

/**
 * The moment a task is marked done.
 *
 * This is the emotional payoff of the whole product — someone standing in their
 * kitchen having actually done the thing. Before this, ticking a chore in the
 * task list did nothing visible: the row simply vanished. The dashboard fired
 * confetti; the list where people actually tick chores was silent.
 *
 * Deliberately restrained, not a confetti cannon. People tick several chores in
 * a row here; a cannon per tick would be exhausting and would make the product
 * feel slower. One precise mark beats ten sparkly ones.
 *
 * MOTION DIET — animates only `stroke-dashoffset`, `transform` and `opacity`,
 * all on the allowed list. No width/height/top/left. The check draw is 180ms,
 * inside the 200ms feedback ceiling.
 *
 * REDUCED MOTION — belt 1 (CSS media query zeroes the animations), belt 2 (the
 * JS gate below never starts them), belt 3 (the base state IS the final visible
 * state: a drawn check with no offset), so a user with reduced motion sees a
 * finished check instantly rather than an empty box.
 *
 * RTL — the glyph is a checkmark, which is not directionally meaningful, and the
 * ring is concentric. Nothing to mirror. `transform-box: fill-box` plus an
 * explicit origin keeps the SVG scale centred (the donut lesson).
 */

import { useReducedMotion } from "@/hooks/useReducedMotion";

export function TaskCompleteMark({ active }: { active: boolean }) {
  const reduced = useReducedMotion();

  if (!active) return null;

  return (
    <span className="bb-mark" aria-hidden="true" data-reduced={reduced ? "1" : undefined}>
      <svg viewBox="0 0 24 24" className="bb-mark__check" fill="none">
        <path
          d="M5 12.5 L10 17.5 L19 7"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
        />
      </svg>
      <span className="bb-mark__ring" />
    </span>
  );
}
