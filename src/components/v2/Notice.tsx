import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

const styles = { info: 'bg-bb-primary-50 text-bb-ink', warning: 'bg-bb-warning-50 text-bb-warning-ink', error: 'bg-bb-danger-50 text-bb-danger-ink', success: 'bg-bb-success-50 text-bb-success-ink' };
const icons = { info: Info, warning: TriangleAlert, error: CircleAlert, success: CircleCheck };
type Dismiss = { onDismiss: () => void; dismissLabel: string } | { onDismiss?: never; dismissLabel?: never };
export function Notice({ tone, children, action, onDismiss, dismissLabel }: { tone: keyof typeof styles; children: ReactNode; action?: ReactNode } & Dismiss) {
  const Icon = icons[tone];
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-bb-md p-4 text-bb-base ${styles[tone]}`}><Icon aria-hidden="true" className="mt-1 size-5 shrink-0"/><div className="min-w-0 flex-1 space-y-2"><div>{children}</div>{action}</div>{onDismiss && <button type="button" aria-label={dismissLabel} onClick={onDismiss} className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-bb-sm hover:bg-bb-card-hover active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-primary"><X aria-hidden="true" className="size-5" /></button>}</div>;
}
