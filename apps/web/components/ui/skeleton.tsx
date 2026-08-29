import { cn } from "@/lib/cn";

export function Skeleton({ className }: { readonly className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse-soft rounded-md bg-white/8",
        className ?? "h-4 w-full",
      )}
    />
  );
}

export function SkeletonRows({
  rows = 4,
  className,
}: {
  readonly rows?: number;
  readonly className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-6">
          <Skeleton className="h-3 w-24 bg-white/6" />
          <Skeleton className="h-3 w-32 bg-white/8" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { readonly count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="panel-surface animate-pulse-soft h-40 rounded-2xl"
        />
      ))}
    </div>
  );
}
