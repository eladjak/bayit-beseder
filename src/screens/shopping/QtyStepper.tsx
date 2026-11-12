import { Minus, Plus } from 'lucide-react';
export function QtyStepper({ title, quantity, onChange, minus, plus }: { title: string; quantity: number; onChange: (n: number) => void; minus: string; plus: string }) {
 const button = 'inline-flex size-11 shrink-0 items-center justify-center rounded-bb-sm hover:bg-bb-primary-50 active:bg-bb-card-hover focus-visible:outline-2 focus-visible:outline-bb-primary disabled:opacity-40';
 return <div className="flex items-center" dir="ltr"><button type="button" className={button} aria-label={minus + title} disabled={quantity <= 1} onClick={() => onChange(Math.max(1, quantity - 1))}><Minus aria-hidden="true" className="size-4" /></button><span className="min-w-6 text-center tabular-nums">{quantity}</span><button type="button" className={button} aria-label={plus + title} onClick={() => onChange(quantity + 1)}><Plus aria-hidden="true" className="size-4" /></button></div>;
}
