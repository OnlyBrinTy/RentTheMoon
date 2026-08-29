import { cn } from "@/lib/cn";

export function Spinner({ className }: { readonly className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80",
        className,
      )}
    />
  );
}
