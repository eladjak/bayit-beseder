import { useId } from "react";
import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";

type Props = { topic: string; children: ReactNode };
export function HelpTip({ topic, children }: Props) {
  const id = useId();
  return (
    <span className="inline-flex">
      <button
        type="button"
        popoverTarget={id}
        aria-label={`הסבר: ${topic}`}
        aria-describedby={id}
        className="inline-flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-bb-primary hover:bg-bb-primary-50"
      >
        <CircleHelp aria-hidden="true" className="size-6" />
      </button>
      <span
        id={id}
        popover="auto"
        role="tooltip"
        className="fixed inset-x-0 bottom-0 top-auto m-0 w-full rounded-t-bb-lg border border-bb-line bg-bb-card p-4 text-bb-ink shadow-bb-2"
      >
        {children}
      </span>
    </span>
  );
}
