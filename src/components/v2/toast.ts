import { toast } from 'sonner';

const classNames = {
  toast: 'bg-bb-card text-bb-ink shadow-bb-2 rounded-bb-md',
  actionButton: 'min-h-11 min-w-11 focus-visible:outline-2 focus-visible:outline-bb-primary',
  success: 'text-bb-ink', error: 'text-bb-danger-ink', info: 'text-bb-ink',
};
export function showToast({ message, tone, undo }: { message: string; tone: 'success' | 'error' | 'info'; undo?: () => Promise<boolean> }) {
  return toast(message, {
    duration: 5000, classNames,
    ...(undo && { action: { label: 'ביטול', onClick: () => {
      void Promise.resolve().then(undo).then((ok) => { if (!ok) toast.error('לא הצלחנו לבטל. אפשר לנסות שוב.', { duration: 5000, classNames }); }).catch(() => toast.error('לא הצלחנו לבטל. אפשר לנסות שוב.', { duration: 5000, classNames }));
    } } }),
    ...(tone === 'error' ? { className: classNames.error } : tone === 'success' ? { className: classNames.success } : { className: classNames.info }),
  });
}
