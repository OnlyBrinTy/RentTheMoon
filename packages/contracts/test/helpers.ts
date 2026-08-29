import { network } from "hardhat";

import type { MoonLandRegistry, MoonMarketplace } from "../types/ethers-contracts/index.js";

const connection = await network.create("hardhat");

export const ethers = connection.ethers;
export const networkHelpers = connection.networkHelpers;
export const time = connection.networkHelpers.time;

export const TOTAL_SECTORS = 2592n;
export const INITIAL_SECTOR_PRICE = 100_000_000_000_000_000n;
export const PLATFORM_FEE_BPS = 300n;
export const BPS_DENOMINATOR = 10_000n;
export const SECONDS_PER_DAY = 86_400n;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const ERC4907_INTERFACE_ID = "0xad092b5c";
export const ERC721_INTERFACE_ID = "0x80ac58cd";
export const ERC721_METADATA_INTERFACE_ID = "0x5b5e139f";
export const ERC721_ENUMERABLE_INTERFACE_ID = "0x780e9d63";
export const ERC165_INTERFACE_ID = "0x01ffc9a7";

export const SECTOR_A = 100n;
export const SECTOR_B = 1_337n;

export function platformFeeOf(total: bigint): bigint {
  return (total * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
}

export function beneficiaryShareOf(total: bigint): bigint {
  return total - platformFeeOf(total);
}

async function namedAccounts() {
  const signers = await ethers.getSigners();
  const [admin, alice, bob, carol, treasury] = signers;

  if (
    admin === undefined ||
    alice === undefined ||
    bob === undefined ||
    carol === undefined ||
    treasury === undefined
  ) {
    throw new Error("The hardhat network must expose at least five accounts.");
  }

  return { admin, alice, bob, carol, treasury };
}

export interface LunarLeaseDeployment {
  registry: MoonLandRegistry;
  marketplace: MoonMarketplace;
  registryAddress: string;
  marketplaceAddress: string;
  admin: Awaited<ReturnType<typeof namedAccounts>>["admin"];
  alice: Awaited<ReturnType<typeof namedAccounts>>["alice"];
  bob: Awaited<ReturnType<typeof namedAccounts>>["bob"];
  carol: Awaited<ReturnType<typeof namedAccounts>>["carol"];
  treasury: Awaited<ReturnType<typeof namedAccounts>>["treasury"];
}

export async function deployLunarLease(): Promise<LunarLeaseDeployment> {
  const { admin, alice, bob, carol, treasury } = await namedAccounts();

  const registry = await ethers.deployContract("MoonLandRegistry", [admin.address], admin);
  const registryAddress = await registry.getAddress();

  const marketplace = await ethers.deployContract(
    "MoonMarketplace",
    [registryAddress, INITIAL_SECTOR_PRICE, PLATFORM_FEE_BPS, admin.address],
    admin,
  );
  const marketplaceAddress = await marketplace.getAddress();

  await registry.connect(admin).grantRole(await registry.MARKETPLACE_ROLE(), marketplaceAddress);

  return {
    registry,
    marketplace,
    registryAddress,
    marketplaceAddress,
    admin,
    alice,
    bob,
    carol,
    treasury,
  };
}

export async function deployWithOwnedSector(): Promise<LunarLeaseDeployment> {
  const deployment = await deployLunarLease();

  await deployment.marketplace
    .connect(deployment.alice)
    .acquireSector(SECTOR_A, { value: INITIAL_SECTOR_PRICE });

  return deployment;
}

export async function deployWithRentableSector(): Promise<
  LunarLeaseDeployment & { pricePerDay: bigint }
> {
  const deployment = await deployWithOwnedSector();
  const pricePerDay = 50_000_000_000_000_000n;

  await deployment.marketplace.connect(deployment.alice).setRentalPrice(SECTOR_A, pricePerDay);
  await deployment.marketplace.connect(deployment.alice).setRentEnabled(SECTOR_A, true);

  return { ...deployment, pricePerDay };
}
