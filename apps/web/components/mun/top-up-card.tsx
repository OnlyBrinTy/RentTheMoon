"use client";

import { useCallback, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { MUN_TO_ETH_RATE, munFromNativeWei } from "@lunarlease/shared";
import { useTopUpBalance } from "@/hooks/use-mun-writes";
import { activeChainId, nativeCurrencySymbol } from "@/lib/config";
import { formatMun, formatPrice, tryParseEther } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "@/components/ui/card";
import { LabeledInput } from "@/components/ui/labeled-input";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useTransactionToasts } from "@/components/ui/toast";

export function TopUpCard() {
  const [value, setValue] = useState("");
  const { address, isConnected } = useAccount();
  const nativeBalance = useBalance({
    address,
    chainId: activeChainId,
    query: { enabled: address !== undefined },
  });

  const parsed = tryParseEther(value);
  const isAmountValid = parsed !== undefined && parsed > 0n;
  const munReceived = isAmountValid ? munFromNativeWei(parsed) : undefined;
  const exceedsWallet =
    parsed !== undefined &&
    nativeBalance.data !== undefined &&
    parsed > nativeBalance.data.value;

  const clearInput = useCallback(() => setValue(""), []);
  const flow = useTopUpBalance(
    isAmountValid && !exceedsWallet ? parsed : undefined,
    clearInput,
  );
  useTransactionToasts(flow, "Top-up");

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Top up with {nativeCurrencySymbol}</CardTitle>
          <CardSubtitle>
            Send {nativeCurrencySymbol} to the marketplace and receive MUN at a fixed rate
            of 1 {nativeCurrencySymbol} = {MUN_TO_ETH_RATE.toString()} MUN.
          </CardSubtitle>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <LabeledInput
          label="Amount to send"
          inputMode="decimal"
          placeholder="0.5"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          suffix={nativeCurrencySymbol}
          invalid={value.length > 0 && (!isAmountValid || exceedsWallet)}
          hint={
            exceedsWallet
              ? `That is more than your wallet holds (${formatPrice(nativeBalance.data?.value ?? 0n, 6)}).`
              : nativeBalance.data !== undefined
                ? `Wallet balance ${formatPrice(nativeBalance.data.value, 6)}.`
                : `Enter the amount of ${nativeCurrencySymbol} to convert.`
          }
        />

        <div className="flex items-baseline justify-between gap-4 rounded-lg border border-white/8 bg-black/25 px-3 py-2.5">
          <span className="text-xs text-white/45">You receive</span>
          <span className="numeric text-base font-semibold text-sky-200">
            {munReceived === undefined ? "—" : formatMun(munReceived, 6)}
          </span>
        </div>

        <Button
          onClick={flow.submit}
          disabled={!flow.canSubmit}
          isLoading={flow.isBusy}
          className="w-full"
        >
          {isConnected ? "Top up balance" : "Connect a wallet to top up"}
        </Button>

        <TransactionStatus flow={flow} />
      </CardBody>
    </Card>
  );
}
