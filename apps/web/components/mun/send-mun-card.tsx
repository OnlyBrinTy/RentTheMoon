"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { useMunBalance } from "@/hooks/use-mun";
import { useSendMun } from "@/hooks/use-mun-writes";
import { formatMun, tryParseAddress, tryParseEther } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardSubtitle, CardTitle } from "@/components/ui/card";
import { LabeledInput } from "@/components/ui/labeled-input";
import { TransactionStatus } from "@/components/ui/transaction-status";
import { useTransactionToasts } from "@/components/ui/toast";

export function SendMunCard() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const { address, isConnected } = useAccount();
  const { balance } = useMunBalance();

  const parsedRecipient = tryParseAddress(recipient);
  const parsedAmount = tryParseEther(amount);
  const isSelf =
    parsedRecipient !== undefined &&
    address !== undefined &&
    parsedRecipient.toLowerCase() === address.toLowerCase();
  const isAmountValid = parsedAmount !== undefined && parsedAmount > 0n;
  const exceedsBalance =
    parsedAmount !== undefined && balance !== undefined && parsedAmount > balance;

  const canSend = parsedRecipient !== undefined && !isSelf && isAmountValid && !exceedsBalance;

  const clearForm = useCallback(() => {
    setRecipient("");
    setAmount("");
  }, []);

  const flow = useSendMun(
    canSend ? parsedRecipient : undefined,
    canSend ? parsedAmount : undefined,
    clearForm,
  );
  useTransactionToasts(flow, "MUN transfer");

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Send MUN</CardTitle>
          <CardSubtitle>
            Move MUN to another account. The transfer settles inside the marketplace
            ledger, so nothing but gas leaves your wallet.
          </CardSubtitle>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <LabeledInput
          label="Recipient address"
          spellCheck={false}
          autoComplete="off"
          placeholder="0x…"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          invalid={recipient.length > 0 && (parsedRecipient === undefined || isSelf)}
          hint={
            recipient.length > 0 && parsedRecipient === undefined
              ? "That is not a valid address."
              : isSelf
                ? "That is your own address."
                : "A 20-byte account address."
          }
        />

        <LabeledInput
          label="Amount"
          inputMode="decimal"
          placeholder="1.0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          suffix="MUN"
          invalid={amount.length > 0 && (!isAmountValid || exceedsBalance)}
          hint={
            exceedsBalance
              ? "That is more MUN than you hold."
              : balance !== undefined
                ? `You hold ${formatMun(balance, 6)}.`
                : "Enter the amount of MUN to send."
          }
        />

        <Button
          onClick={flow.submit}
          disabled={!flow.canSubmit}
          isLoading={flow.isBusy}
          className="w-full"
        >
          {isConnected ? "Send MUN" : "Connect a wallet to send"}
        </Button>

        <TransactionStatus flow={flow} />
      </CardBody>
    </Card>
  );
}
