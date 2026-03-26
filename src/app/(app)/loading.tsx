export default function Loading() {
  return (
    <div className="min-h-[60dvh] flex items-center justify-center" dir="rtl">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center animate-pulse">
          <span className="text-white text-xl">🏠</span>
        </div>
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
