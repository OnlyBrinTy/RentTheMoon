"use client";

import { useMemo, useState } from "react";
import {
  MAX_RENTAL_DAYS,
  MIN_RENTAL_DAYS,
  rentalExpiry,
  rentalTotalPrice,
  splitPlatformFee,
  type SectorChainState,
} from "@lunarlease/shared";
import { useNow } from "@/hooks/use-now";
import { usePlatformFeeBps } from "@/hooks/use-marketplace-info";
import { useRentSector } from "@/hooks/use-sector-writes";
import {
  formatPercentFromBps,
  formatMun,
  formatUnixTimestamp,
  tryParseDayCount,
} from "@/lib/format";
import { MunBalanceNotice } from "@/components/mun/mun-balance-notice";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { LegalNoticeCallout } from "@/components/ui/legal-notice";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useTransactionToasts } from "@/components/ui/toast";
import { ActionShell } from "./action-shell";

export function RentAction({ sector }: { readonly sector: SectorChainState }) {
  const [dayInput, setDayInput] = useState("7");
  const now = useNow(10_000);
  const { feeBps } = usePlatformFeeBps();

  const parsedDays = tryParseDayCount(dayInput);
  const isDayCountValid =
    parsedDays !== undefined &&
    parsedDays >= MIN_RENTAL_DAYS &&
    parsedDays <= MAX_RENTAL_DAYS;

  const totalPrice = useMemo(() => {
    if (!isDayCountValid || parsedDays === undefined) return undefined;
    return rentalTotalPrice(sector.pricePerDay, parsedDays);
  }, [isDayCountValid, parsedDays, sector.pricePerDay]);

  const flow = useRentSector(
    sector.sectorId,
    isDayCountValid ? parsedDays : undefined,
    totalPrice,
  );
  useTransactionToasts(flow, "Rental");

  const split = totalPrice === undefined ? undefined : splitPlatformFee(totalPrice);
  const expiresAt =
    parsedDays !== undefined && isDayCountValid ? rentalExpiry(parsedDays, now) : undefined;

  return (
    <ActionShell
      title="Rent this sector"
      description="Renting grants you ERC-4907 usage rights for the chosen period and debits your MUN balance. Ownership stays with the owner."
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-white/45">Price per day</span>
        <span className="numeric text-sm font-semibold text-white">
          {formatMun(sector.pricePerDay)}
        </span>
      </div>

      <LabeledInput
        label="Rental duration"
        inputMode="numeric"
        value={dayInput}
        onChange={(event) => setDayInput(event.target.value)}
        suffix="days"
        invalid={dayInput.length > 0 && !isDayCountValid}
        hint={`Between ${MIN_RENTAL_DAYS} and ${MAX_RENTAL_DAYS} days.`}
      />

      <div className="space-y-1.5 rounded-lg border border-white/8 bg-black/25 px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-xs text-white/45">Total</span>
          <span className="numeric text-base font-semibold text-sky-200">
            {totalPrice === undefined ? "—" : formatMun(totalPrice, 6)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[11px] text-white/35">
            Platform fee ({formatPercentFromBps(feeBps)})
          </span>
          <span className="numeric text-[11px] text-white/50">
            {split === undefined ? "—" : formatMun(split.platformFee, 6)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[11px] text-white/35">To sector owner</span>
          <span className="numeric text-[11px] text-white/50">
            {split === undefined ? "—" : formatMun(split.sellerProceeds, 6)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-white/5 pt-1.5">
          <span className="text-[11px] text-white/35">Expires around</span>
          <span className="text-[11px] text-white/50">
            {expiresAt === undefined ? "—" : formatUnixTimestamp(expiresAt)}
          </span>
        </div>
      </div>

      <MunBalanceNotice required={totalPrice} />

      <LegalNoticeCallout />

      <Button
        onClick={flow.submit}
        disabled={!flow.canSubmit}
        isLoading={flow.isBusy}
        className="w-full"
      >
        Rent for {isDayCountValid ? dayInput : "—"} days
      </Button>

      <TransactionStatus flow={flow} />
    </ActionShell>
  );
}
