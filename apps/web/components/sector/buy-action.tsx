"use client";

import type { SectorChainState } from "@lunarlease/shared";
import { splitPlatformFee } from "@lunarlease/shared";
import { usePlatformFeeBps } from "@/hooks/use-marketplace-info";
import { useBuyListedSector } from "@/hooks/use-sector-writes";
import { formatPercentFromBps, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LegalNoticeCallout } from "@/components/ui/legal-notice";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useTransactionToasts } from "@/components/ui/toast";
import { ActionShell } from "./action-shell";

export function BuyAction({ sector }: { readonly sector: SectorChainState }) {
  const { feeBps } = usePlatformFeeBps();
  const flow = useBuyListedSector(sector.sectorId, sector.salePrice);
  useTransactionToasts(flow, "Purchase");

  const split = splitPlatformFee(sector.salePrice);

  return (
    <ActionShell
      title="Buy this sector"
      description="Secondary market purchase. The ERC-721 token transfers to you and any rental user is cleared."
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-white/45">Listing price</span>
        <span className="numeric text-lg font-semibold text-amber-200">
          {formatPrice(sector.salePrice, 6)}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4 rounded-lg border border-white/8 bg-black/25 px-3 py-2">
        <span className="text-[11px] text-white/35">
          Platform fee ({formatPercentFromBps(feeBps)})
        </span>
        <span className="numeric text-[11px] text-white/50">
          {formatPrice(split.platformFee, 6)}
        </span>
      </div>

      <LegalNoticeCallout />

      <Button
        onClick={flow.submit}
        disabled={!flow.canSubmit}
        isLoading={flow.isBusy}
        className="w-full"
      >
        Buy sector #{sector.sectorId}
      </Button>

      <TransactionStatus flow={flow} />
    </ActionShell>
  );
}
