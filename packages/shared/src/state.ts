import {
  BPS_DENOMINATOR,
  FARMED_MUN_PER_DAY,
  MUN_TO_ETH_RATE,
  PLATFORM_FEE_BPS,
  SECONDS_PER_DAY,
} from "./constants/index.js";
import {
  ZERO_ADDRESS,
  type OwnershipPeriod,
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

export function munFromNativeWei(nativeWei: bigint): bigint {
  return nativeWei * MUN_TO_ETH_RATE;
}

export function nativeWeiFromMun(amountMun: bigint): bigint {
  return amountMun / MUN_TO_ETH_RATE;
}

export function isOwnershipPeriodOpenEnded(period: OwnershipPeriod): boolean {
  return period.expiry === 0n;
}

export function heldSecondsSince(
  periods: readonly OwnershipPeriod[],
  checkpoint: bigint,
  at: bigint = nowSeconds(),
): bigint {
  let secondsHeld = 0n;

  for (const period of periods) {
    const from = period.start > checkpoint ? period.start : checkpoint;
    const to = period.expiry === 0n || period.expiry > at ? at : period.expiry;
    if (to > from) secondsHeld += to - from;
  }

  return secondsHeld;
}

export function projectedFarmedMun(
  periods: readonly OwnershipPeriod[],
  checkpoint: bigint,
  at: bigint = nowSeconds(),
): bigint {
  return (heldSecondsSince(periods, checkpoint, at) * FARMED_MUN_PER_DAY) / SECONDS_PER_DAY;
}

export function farmingRateMunPerDay(
  periods: readonly OwnershipPeriod[],
  at: bigint = nowSeconds(),
): bigint {
  let active = 0n;
  for (const period of periods) {
    if (period.start > at) continue;
    if (period.expiry !== 0n && period.expiry <= at) continue;
    active += 1n;
  }
  return active * FARMED_MUN_PER_DAY;
}

export function splitPlatformFee(total: bigint): {
  platformFee: bigint;
  sellerProceeds: bigint;
} {
  const platformFee = (total * BigInt(PLATFORM_FEE_BPS)) / BigInt(BPS_DENOMINATOR);
  return { platformFee, sellerProceeds: total - platformFee };
}
