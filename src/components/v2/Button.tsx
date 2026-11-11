import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { LoaderCircle } from "lucide-react";

type Common = {
  variant?: "primary" | "quiet" | "danger" | "link";
  size?: "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
};
type Props = Common &
  (
    | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: never })
    | (AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })
  );

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  startIcon,
  endIcon,
  children,
  className = "",
  disabled,
  ...props
}: Props) {
  const classes = `relative inline-flex items-center justify-center gap-2 rounded-bb-md px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-primary motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[.97] disabled:opacity-50 ${size === "lg" ? "min-h-14" : "min-h-12"} ${{ primary: "bg-bb-primary text-bb-on-primary hover:bg-bb-primary-hover", quiet: "bg-bb-card text-bb-ink hover:bg-bb-primary-50", danger: "bg-bb-danger-50 text-bb-danger-ink hover:opacity-80", link: "text-bb-primary underline hover:text-bb-primary-hover" }[variant]} ${className}`;
  const content = (
    <>
      <span
        className={`inline-flex items-center justify-center gap-2 ${loading ? "opacity-0" : ""}`}
      >
        {startIcon}
        {children}
        {endIcon}
      </span>
      {loading && (
        <LoaderCircle
          className="absolute size-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      )}
    </>
  );
  if (props.href !== undefined) {
    const { href, onClick, ...anchorProps } = props;
    return (
      <Link
        {...anchorProps}
        href={href}
        className={`${classes} ${disabled || loading ? "opacity-50" : ""}`}
        aria-disabled={disabled || loading || undefined}
        aria-busy={loading || undefined}
        onClick={(event) => {
          if (disabled || loading) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}
