import { formatEther, getAddress, isAddress, parseEther, type Address } from "viem";
import { MUN_SYMBOL, ZERO_ADDRESS } from "@lunarlease/shared";
import { nativeCurrencySymbol } from "./config";

export function truncateAddress(address: Address | undefined, size = 4): string {
  if (!address) return "—";
  return `${address.slice(0, 2 + size)}…${address.slice(-size)}`;
}

export function isZeroAddress(address: Address | undefined): boolean {
  return address === undefined || address === ZERO_ADDRESS;
}

function trimFractionDigits(value: string, maxFractionDigits: number): string {
  const [whole = "0", fraction] = value.split(".");
  if (fraction === undefined || maxFractionDigits <= 0) return whole;

  const truncated = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  return truncated.length > 0 ? `${whole}.${truncated}` : whole;
}

export function formatTokenAmount(wei: bigint, maxFractionDigits = 4): string {
  return trimFractionDigits(formatEther(wei), maxFractionDigits);
}

export function formatPrice(wei: bigint, maxFractionDigits = 4): string {
  return `${formatTokenAmount(wei, maxFractionDigits)} ${nativeCurrencySymbol}`;
}

export function formatMun(munWei: bigint, maxFractionDigits = 4): string {
  return `${formatTokenAmount(munWei, maxFractionDigits)} ${MUN_SYMBOL}`;
}

export function tryParseAddress(value: string): Address | undefined {
  const trimmed = value.trim();
  if (!isAddress(trimmed)) return undefined;
  const checksummed = getAddress(trimmed);
  return checksummed === ZERO_ADDRESS ? undefined : checksummed;
}

export function toEtherInputValue(wei: bigint): string {
  return formatEther(wei);
}

export function tryParseEther(value: string): bigint | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (!/^\d*(\.\d*)?$/.test(trimmed)) return undefined;
  try {
    const parsed = parseEther(trimmed);
    return parsed < 0n ? undefined : parsed;
  } catch {
    return undefined;
  }
}

export function tryParseDayCount(value: string): bigint | undefined {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = BigInt(trimmed);
  return parsed > 0n ? parsed : undefined;
}

export function formatSecondsRemaining(seconds: bigint): string {
  if (seconds <= 0n) return "expired";

  const days = seconds / 86_400n;
  const hours = (seconds % 86_400n) / 3_600n;
  const minutes = (seconds % 3_600n) / 60n;
  const secs = seconds % 60n;

  if (days > 0n) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0n) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0n) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatUnixTimestamp(seconds: bigint): string {
  if (seconds <= 0n) return "—";
  const millis = Number(seconds * 1000n);
  if (!Number.isFinite(millis)) return "—";
  return new Date(millis).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatPercentFromBps(bps: number): string {
  const whole = Math.trunc(bps / 100);
  const remainder = bps % 100;
  return remainder === 0 ? `${whole}%` : `${whole}.${String(remainder).padStart(2, "0")}%`;
}
