import type { Address, SectorChainState, SectorVisualState } from "@lunarlease/shared";

export interface SectorViewResult {
  readonly sectorId: bigint;
  readonly minted: boolean;
  readonly owner: Address;
  readonly user: Address;
  readonly userExpires: bigint;
  readonly rentEnabled: boolean;
  readonly pricePerDay: bigint;
  readonly saleEnabled: boolean;
  readonly salePrice: bigint;
}

export function toSectorChainState(view: SectorViewResult): SectorChainState {
  return {
    sectorId: Number(view.sectorId),
    minted: view.minted,
    owner: view.owner,
    user: view.user,
    userExpires: view.userExpires,
    rentEnabled: view.rentEnabled,
    pricePerDay: view.pricePerDay,
    saleEnabled: view.saleEnabled,
    salePrice: view.salePrice,
  };
}

export function isListedForSale(state: SectorChainState): boolean {
  return state.minted && state.saleEnabled && state.salePrice > 0n;
}

export function isRentable(state: SectorChainState, at: bigint): boolean {
  return (
    state.minted &&
    state.rentEnabled &&
    state.pricePerDay > 0n &&
    state.userExpires <= at
  );
}

export function isOwnedBy(
  state: SectorChainState,
  account: Address | undefined,
): boolean {
  if (!account) return false;
  return state.minted && state.owner.toLowerCase() === account.toLowerCase();
}

export function isRentedBy(
  state: SectorChainState,
  account: Address | undefined,
  at: bigint,
): boolean {
  if (!account) return false;
  return state.user.toLowerCase() === account.toLowerCase() && state.userExpires > at;
}

export function sortBySectorId(a: SectorChainState, b: SectorChainState): number {
  return a.sectorId - b.sectorId;
}

export type { SectorVisualState };
