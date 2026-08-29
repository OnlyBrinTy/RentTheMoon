"use client";

import { useAccount } from "wagmi";
import { useClaimableBalance } from "@/hooks/use-marketplace-info";
import { useWithdrawRentalIncome } from "@/hooks/use-sector-writes";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "@/components/ui/card";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useTransactionToasts } from "@/components/ui/toast";

export function WithdrawIncomeCard() {
  const { isConnected } = useAccount();
  const { balance, isLoading } = useClaimableBalance();
  const flow = useWithdrawRentalIncome(balance);
  useTransactionToasts(flow, "Withdrawal");

  if (!isConnected) return null;

  const hasBalance = balance !== undefined && balance > 0n;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Claimable balance</CardTitle>
          <CardSubtitle>
            Rental income, sale proceeds and refunded overpayments accumulate here.
          </CardSubtitle>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="numeric text-2xl font-semibold text-emerald-200">
          {isLoading || balance === undefined ? "…" : formatPrice(balance, 6)}
        </p>
        <Button
          variant={hasBalance ? "primary" : "secondary"}
          onClick={flow.submit}
          disabled={!flow.canSubmit}
          isLoading={flow.isBusy}
        >
          Withdraw
        </Button>
        <TransactionStatus flow={flow} />
      </CardBody>
    </Card>
  );
}
