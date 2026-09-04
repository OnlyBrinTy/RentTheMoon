"use client";

import { useAccount } from "wagmi";
import type { OwnershipPeriod } from "@lunarlease/shared";
import { useFarming } from "@/hooks/use-mun";
import { useClaimFarmedBalance } from "@/hooks/use-mun-writes";
import { formatMun, formatUnixTimestamp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "@/components/ui/card";
import { DataList, DataRow } from "@/components/ui/data-row";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useTransactionToasts } from "@/components/ui/toast";

function periodLabel(period: OwnershipPeriod): string {
  return period.expiry === 0n ? "Owned" : "Rented";
}

function PeriodList({ periods }: { readonly periods: readonly OwnershipPeriod[] }) {
  if (periods.length === 0) {
    return (
      <p className="text-[11px] leading-relaxed text-white/40">
        You hold no sectors, so nothing is farming yet. Acquire or rent a sector to start
        accruing MUN.
      </p>
    );
  }

  return (
    <DataList>
      {periods.map((period, index) => (
        <DataRow
          key={`${period.start}-${period.expiry}-${index}`}
          label={`${periodLabel(period)} since ${formatUnixTimestamp(period.start)}`}
        >
          <span className="numeric text-white/60">
            {period.expiry === 0n
              ? "open-ended"
              : `until ${formatUnixTimestamp(period.expiry)}`}
          </span>
        </DataRow>
      ))}
    </DataList>
  );
}

export function FarmingCard() {
  const { isConnected } = useAccount();
  const { settled, projected, ratePerDay, checkpoint, periods, isLoading } = useFarming();
  const flow = useClaimFarmedBalance(settled);
  useTransactionToasts(flow, "Farming claim");

  const displayed = projected ?? settled;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Farmed MUN</CardTitle>
          <CardSubtitle>
            Every sector you own or rent farms 1 MUN per day. Claiming credits the accrual
            to your MUN balance and resets the clock.
          </CardSubtitle>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="numeric text-3xl font-semibold text-emerald-200">
          {isLoading || displayed === undefined ? "…" : formatMun(displayed, 6)}
        </p>

        <DataList>
          <DataRow label="Accrual rate">
            <span className="numeric">
              {ratePerDay === undefined ? "—" : `${formatMun(ratePerDay, 4)} / day`}
            </span>
          </DataRow>
          <DataRow label="Last claimed">
            {checkpoint === undefined || checkpoint === 0n
              ? "Never"
              : formatUnixTimestamp(checkpoint)}
          </DataRow>
        </DataList>

        <Button
          variant={settled !== undefined && settled > 0n ? "primary" : "secondary"}
          onClick={flow.submit}
          disabled={!flow.canSubmit}
          isLoading={flow.isBusy}
          className="w-full"
        >
          {isConnected ? "Claim farmed MUN" : "Connect a wallet to claim"}
        </Button>

        <TransactionStatus flow={flow} />

        {periods !== undefined ? (
          <div className="space-y-1.5 border-t border-white/5 pt-3">
            <p className="text-[11px] font-semibold tracking-wide text-white/45 uppercase">
              Holding periods
            </p>
            <PeriodList periods={periods} />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
