"use client";

import { useState } from "react";
import { isRentalActive, MUN_SYMBOL, type SectorChainState } from "@lunarlease/shared";
import { useNow } from "@/hooks/use-now";
import {
  useCancelListing,
  useListForSale,
  useSetRentEnabled,
  useSetRentalPrice,
} from "@/hooks/use-sector-writes";
import { formatMun, toEtherInputValue, tryParseEther } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useTransactionToasts } from "@/components/ui/toast";
import { ActionShell } from "./action-shell";

function RentalPriceControl({ sector }: { readonly sector: SectorChainState }) {
  const [value, setValue] = useState(() =>
    sector.pricePerDay > 0n ? toEtherInputValue(sector.pricePerDay) : "",
  );
  const parsed = tryParseEther(value);
  const flow = useSetRentalPrice(sector.sectorId, parsed);
  useTransactionToasts(flow, "Rental price update");

  return (
    <div className="space-y-3">
      <LabeledInput
        label="Rental price per day"
        inputMode="decimal"
        placeholder="0.01"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        suffix={MUN_SYMBOL}
        invalid={value.length > 0 && parsed === undefined}
        hint={
          sector.pricePerDay > 0n
            ? `Currently ${formatMun(sector.pricePerDay, 6)} / day`
            : "No rental price set yet."
        }
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={flow.submit}
        disabled={!flow.canSubmit}
        isLoading={flow.isBusy}
      >
        Update rental price
      </Button>
      <TransactionStatus flow={flow} />
    </div>
  );
}

function RentAvailabilityControl({ sector }: { readonly sector: SectorChainState }) {
  const flow = useSetRentEnabled(sector.sectorId, !sector.rentEnabled);
  useTransactionToasts(flow, "Rental availability update");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-white/8 bg-black/25 px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold text-white/80">Renting</p>
          <p className="text-[11px] text-white/40">
            {sector.rentEnabled
              ? "Visitors can rent this sector."
              : "Renting is currently disabled."}
          </p>
        </div>
        <Button
          variant={sector.rentEnabled ? "danger" : "secondary"}
          size="sm"
          onClick={flow.submit}
          disabled={!flow.canSubmit}
          isLoading={flow.isBusy}
        >
          {sector.rentEnabled ? "Disable" : "Enable"}
        </Button>
      </div>
      <TransactionStatus flow={flow} />
    </div>
  );
}

function SaleControl({ sector }: { readonly sector: SectorChainState }) {
  const now = useNow(10_000);
  const [value, setValue] = useState(() =>
    sector.salePrice > 0n ? toEtherInputValue(sector.salePrice) : "",
  );
  const parsed = tryParseEther(value);
  const listFlow = useListForSale(sector.sectorId, parsed);
  const cancelFlow = useCancelListing(sector.sectorId);
  useTransactionToasts(listFlow, "Listing");
  useTransactionToasts(cancelFlow, "Listing cancellation");

  const isListed = sector.saleEnabled && sector.salePrice > 0n;
  const rentalActive = isRentalActive(sector.userExpires, now);

  return (
    <div className="space-y-3">
      <LabeledInput
        label="Sale price"
        inputMode="decimal"
        placeholder="0.25"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        suffix={MUN_SYMBOL}
        invalid={value.length > 0 && parsed === undefined}
        hint={
          isListed
            ? `Listed at ${formatMun(sector.salePrice, 6)}`
            : "Not currently listed."
        }
      />

      {rentalActive ? (
        <p className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-100/75">
          A rental is active. Buyers cannot settle a purchase until the rental expires.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={listFlow.submit}
          disabled={!listFlow.canSubmit}
          isLoading={listFlow.isBusy}
        >
          {isListed ? "Update listing" : "List for sale"}
        </Button>
        {isListed ? (
          <Button
            variant="danger"
            size="sm"
            onClick={cancelFlow.submit}
            disabled={!cancelFlow.canSubmit}
            isLoading={cancelFlow.isBusy}
          >
            Cancel listing
          </Button>
        ) : null}
      </div>

      <TransactionStatus flow={listFlow} />
      <TransactionStatus flow={cancelFlow} />
    </div>
  );
}

export function OwnerControls({ sector }: { readonly sector: SectorChainState }) {
  return (
    <div className="space-y-3">
      <ActionShell
        title="Rental settings"
        description="You own this sector. Set a daily price and open it up for renters."
      >
        <RentalPriceControl sector={sector} />
        <RentAvailabilityControl sector={sector} />
      </ActionShell>

      <ActionShell
        title="Secondary market"
        description="List the sector for sale. A sale cannot settle while a rental is active."
      >
        <SaleControl sector={sector} />
      </ActionShell>
    </div>
  );
}
