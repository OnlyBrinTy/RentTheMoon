import { BPS_DENOMINATOR, PLATFORM_FEE_BPS, SECONDS_PER_DAY } from "./constants/index.js";
import {
  ZERO_ADDRESS,
  type SectorChainState,
  type SectorLifecycleStatus,
  type SectorVisualState,
} from "./types/index.js";

export function nowSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

export function isRentalActive(
  userExpires: bigint,
  at: bigint = nowSeconds(),
): boolean {
  return userExpires > at;
}

export function deriveLifecycleStatus(
  state: Pick<SectorChainState, "minted" | "user" | "userExpires">,
  at: bigint = nowSeconds(),
): SectorLifecycleStatus {
  if (!state.minted) return "unclaimed";
  if (state.user !== ZERO_ADDRESS && isRentalActive(state.userExpires, at)) {
    return "rented";
  }
  return "owned";
}

export function deriveVisualState(
  state: SectorChainState,
  options: { selected?: boolean; at?: bigint } = {},
): SectorVisualState {
  if (options.selected) return "selected";

  const lifecycle = deriveLifecycleStatus(state, options.at ?? nowSeconds());
  if (lifecycle === "unclaimed") return "unclaimed";
  if (lifecycle === "rented") return "rented";
  if (state.saleEnabled && state.salePrice > 0n) return "forSale";
  return "owned";
}

export function effectiveUser(
  state: Pick<SectorChainState, "owner" | "user" | "userExpires">,
  at: bigint = nowSeconds(),
): SectorChainState["owner"] {
  return isRentalActive(state.userExpires, at) ? state.user : ZERO_ADDRESS;
}

export function rentalTotalPrice(
  pricePerDay: bigint,
  numberOfDays: bigint,
): bigint {
  if (numberOfDays <= 0n) throw new Error("numberOfDays must be positive");
  return pricePerDay * numberOfDays;
}

export function rentalExpiry(
  numberOfDays: bigint,
  from: bigint = nowSeconds(),
): bigint {
  return from + numberOfDays * SECONDS_PER_DAY;
}

export function splitPlatformFee(total: bigint): {
  platformFee: bigint;
  sellerProceeds: bigint;
} {
  const platformFee = (total * BigInt(PLATFORM_FEE_BPS)) / BigInt(BPS_DENOMINATOR);
  return { platformFee, sellerProceeds: total - platformFee };
}
