"use client";

import { nativeWeiFromMun } from "@lunarlease/shared";
import { useMunBalance } from "@/hooks/use-mun";
import { formatMun, formatPrice } from "@/lib/format";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "@/components/ui/card";

export function MunBalanceCard() {
  const { balance, isLoading } = useMunBalance();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>MUN balance</CardTitle>
          <CardSubtitle>
            MUN is the marketplace&apos;s internal currency. Acquisitions, rentals and
            purchases are all settled from this balance.
          </CardSubtitle>
        </div>
      </CardHeader>
      <CardBody className="space-y-1">
        <p className="numeric text-3xl font-semibold text-sky-200">
          {isLoading || balance === undefined ? "…" : formatMun(balance, 6)}
        </p>
        <p className="text-[11px] text-white/40">
          {balance === undefined
            ? "Connect a wallet to see your balance."
            : `Worth ${formatPrice(nativeWeiFromMun(balance), 6)} at the fixed top-up rate.`}
        </p>
      </CardBody>
    </Card>
  );
}
