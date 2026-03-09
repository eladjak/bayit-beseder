"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div dir="rtl" className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <div className="card-elevated p-8 text-center max-w-sm w-full">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-lg font-bold text-foreground mb-2">משהו השתבש</h2>
        <p className="text-sm text-muted mb-6">אירעה שגיאה לא צפויה. נסו לרענן את הדף.</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-xl gradient-primary text-white font-medium text-sm shadow-md shadow-primary/20 active:scale-95 transition-transform"
        >
          נסו שוב
        </button>
      </div>
    </div>
  );
}
