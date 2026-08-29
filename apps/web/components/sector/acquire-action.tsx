"use client";

import { useInitialSectorPrice } from "@/hooks/use-marketplace-info";
import { useAcquireSector } from "@/hooks/use-sector-writes";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LegalNoticeCallout } from "@/components/ui/legal-notice";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useTransactionToasts } from "@/components/ui/toast";
import { ActionShell } from "./action-shell";

export function AcquireAction({ sectorId }: { readonly sectorId: number }) {
  const { price, isLoading } = useInitialSectorPrice();
  const flow = useAcquireSector(sectorId, price);
  useTransactionToasts(flow, "Acquisition");

  return (
    <ActionShell
      title="Acquire this sector"
      description="This sector has never been claimed. Acquiring mints the ERC-721 token to your wallet."
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-white/45">Primary price</span>
        <span className="numeric text-lg font-semibold text-white">
          {isLoading ? "…" : formatPrice(price)}
        </span>
      </div>

      <LegalNoticeCallout />

      <Button
        onClick={flow.submit}
        disabled={!flow.canSubmit}
        isLoading={flow.isBusy}
        className="w-full"
      >
        Acquire sector #{sectorId}
      </Button>

      <TransactionStatus flow={flow} />
    </ActionShell>
  );
}
