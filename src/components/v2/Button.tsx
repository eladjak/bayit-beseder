import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'quiet'|'danger'|'link'; size?: 'md'|'lg'; loading?: boolean; href?: string; startIcon?: ReactNode; endIcon?: ReactNode };
export function Button({variant='primary', size='md', loading=false, href, startIcon, endIcon, children, className='', disabled, ...props}: Props) {
 const classes = `inline-flex items-center justify-center gap-2 rounded-bb-md px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-primary motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[.97] disabled:opacity-50 ${size === 'lg' ? 'min-h-14' : 'min-h-12'} ${{primary:'bg-bb-primary text-bb-on-primary hover:bg-bb-primary-hover',quiet:'bg-bb-card text-bb-ink hover:bg-bb-primary-50',danger:'bg-bb-danger-50 text-bb-danger-ink hover:bg-bb-danger-50',link:'text-bb-primary underline hover:text-bb-primary-hover'}[variant]} ${className}`;
 const content=<>{loading ? <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true"/> : startIcon}{children}{endIcon}</>;
 if (href && !disabled && !loading) return <Link href={href} className={classes}>{content}</Link>;
 return <button {...props} type={props.type ?? 'button'} className={classes} disabled={disabled || loading} aria-busy={loading || undefined}>{content}</button>;
}
