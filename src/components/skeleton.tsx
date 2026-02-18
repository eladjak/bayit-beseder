export function TaskSkeleton() {
  return (
    <div className="bg-surface rounded-xl p-3 flex items-center gap-3 animate-pulse">
      <div className="w-7 h-7 rounded-full bg-border" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-border rounded-lg w-3/4" />
        <div className="flex gap-2">
          <div className="h-3 bg-border rounded-full w-12" />
          <div className="h-3 bg-border rounded-full w-8" />
        </div>
      </div>
    </div>
  );
}

export function TaskListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <TaskSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl p-4 animate-pulse">
      <div className="h-3 bg-border rounded w-16 mb-2" />
      <div className="h-7 bg-border rounded w-12" />
    </div>
  );
}

export function RingSkeleton() {
  return (
    <div className="w-[200px] h-[200px] rounded-full border-[14px] border-border animate-pulse mx-auto" />
  );
}
