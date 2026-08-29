"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import type { TransactionFlow } from "@/hooks/use-write-lifecycle";
import { explorerTxUrl } from "@/lib/config";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  readonly id: number;
  readonly title: string;
  readonly description?: string;
  readonly variant: ToastVariant;
  readonly href?: string;
}

interface ToastContextValue {
  readonly push: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const variantClasses: Record<ToastVariant, string> = {
  success: "border-emerald-400/30 bg-emerald-500/10",
  error: "border-rose-400/30 bg-rose-500/10",
  info: "border-sky-400/30 bg-sky-500/10",
};

const variantDot: Record<ToastVariant, string> = {
  success: "bg-emerald-400",
  error: "bg-rose-400",
  info: "bg-sky-400",
};

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 7_000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "animate-rise pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md",
              variantClasses[toast.variant],
            )}
          >
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", variantDot[toast.variant])}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/90">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-white/60">
                    {toast.description}
                  </p>
                ) : null}
                {toast.href ? (
                  <a
                    href={toast.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-block text-xs font-semibold text-sky-300 hover:text-sky-200"
                  >
                    View on explorer
                  </a>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-white/35 transition-colors hover:text-white/70"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToasts(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? { push: () => undefined };
}

export function useTransactionToasts(flow: TransactionFlow, label: string): void {
  const { push } = useToasts();
  const announced = useRef<string | undefined>(undefined);

  useEffect(() => {
    const signature = `${flow.phase}:${flow.hash ?? ""}:${flow.errorMessage ?? ""}`;
    if (announced.current === signature) return;

    if (flow.phase === "success") {
      announced.current = signature;
      push({
        title: `${label} confirmed`,
        description: "The transaction was included on chain.",
        variant: "success",
        href: flow.hash ? explorerTxUrl(flow.hash) : undefined,
      });
      return;
    }

    if (flow.phase === "error" && flow.errorMessage !== undefined) {
      announced.current = signature;
      push({ title: `${label} failed`, description: flow.errorMessage, variant: "error" });
    }
  }, [flow.phase, flow.hash, flow.errorMessage, label, push]);
}
