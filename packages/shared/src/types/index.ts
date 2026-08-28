export type Hex = `0x${string}`;
export type Address = `0x${string}`;

export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

export interface SectorBounds {
  readonly latMin: number;
  readonly latMax: number;
  readonly lonMin: number;
  readonly lonMax: number;
}

export interface SectorInfo {
  readonly sectorId: number;
  readonly latitudeIndex: number;
  readonly longitudeIndex: number;
  readonly bounds: SectorBounds;
  readonly center: { readonly lat: number; readonly lon: number };
}

export type SectorLifecycleStatus = "unclaimed" | "owned" | "rented";

export interface SectorChainState {
  readonly sectorId: number;
  readonly minted: boolean;
  readonly owner: Address;
  readonly user: Address;
  readonly userExpires: bigint;
  readonly rentEnabled: boolean;
  readonly pricePerDay: bigint;
  readonly saleEnabled: boolean;
  readonly salePrice: bigint;
}

export type SectorVisualState =
  | "unclaimed"
  | "owned"
  | "rented"
  | "forSale"
  | "selected";

export interface DeployedAddresses {
  readonly registry: Address;
  readonly marketplace: Address;
  readonly chainId: number;
}

export interface SectorMetadataAttribute {
  readonly trait_type: string;
  readonly value: string | number;
}

export interface SectorMetadata {
  readonly name: string;
  readonly description: string;
  readonly attributes: readonly SectorMetadataAttribute[];
}
