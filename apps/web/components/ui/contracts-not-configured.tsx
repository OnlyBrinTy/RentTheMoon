import { activeChain, missingContractEnvVars } from "@/lib/config";
import { cn } from "@/lib/cn";

export function ContractsNotConfigured({ className }: { readonly className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-5 py-4",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-amber-100">Contracts not configured</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-amber-100/70">
        LunarLease is running against{" "}
        <span className="font-semibold">{activeChain.name}</span> but no deployment
        addresses were provided, so on-chain sector data cannot be read. Set the
        following environment variables in{" "}
        <code className="numeric rounded bg-black/30 px-1 py-0.5 text-amber-200">
          apps/web/.env.local
        </code>{" "}
        and restart the dev server.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {missingContractEnvVars.map((name) => (
          <li
            key={name}
            className="numeric rounded-md border border-amber-400/25 bg-black/25 px-2 py-1 text-[11px] text-amber-200"
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
