import Link from "next/link";
import type { ReactNode } from "react";
type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  room?: string;
  className?: string;
};
export function Card({ children, href, onClick, room, className = "" }: Props) {
  const classes = `block rounded-bb-lg border border-bb-line bg-bb-card p-4 text-start shadow-bb-1 ${room ? "border-s-4 border-s-bb-primary" : ""} ${href || onClick ? "min-h-11 w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-primary motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[.97]" : ""} ${className}`;
  const content = (
    <>
      {room && <span className="block text-bb-sm font-semibold">{room}</span>}
      {children}
    </>
  );
  if (href)
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    );
  return <div className={classes}>{content}</div>;
}
