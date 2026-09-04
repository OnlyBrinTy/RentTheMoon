export const LATITUDE_STEP_DEG = 5;
export const LONGITUDE_STEP_DEG = 5;

export const LATITUDE_BANDS = 180 / LATITUDE_STEP_DEG;
export const LONGITUDE_BANDS = 360 / LONGITUDE_STEP_DEG;

export const TOTAL_SECTORS = LATITUDE_BANDS * LONGITUDE_BANDS;

export const MIN_SECTOR_ID = 0;
export const MAX_SECTOR_ID = TOTAL_SECTORS - 1;

export const INITIAL_SECTOR_PRICE_WEI = 10_000_000_000_000_000_000n; // 0.1 MUN

export const PLATFORM_FEE_BPS = 300;
export const BPS_DENOMINATOR = 10_000;

export const MIN_RENTAL_DAYS = 1n;
export const MAX_RENTAL_DAYS = 365n;
export const SECONDS_PER_DAY = 86_400n;

export const MUN_SYMBOL = "MUN";
export const MUN_DECIMALS = 18;
export const MUN_TO_ETH_RATE = 10n;
export const FARMED_MUN_PER_DAY = 1_000_000_000_000_000_000n;

export const MOON_RADIUS_KM = 1737.4;

export const CHAIN_IDS = {
  hardhat: 31337,
  polygonAmoy: 80002,
  polygon: 137,
} as const;

export type SupportedChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];
