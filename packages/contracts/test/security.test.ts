import { expect } from "chai";
import { describe, it } from "mocha";

import {
  INITIAL_SECTOR_PRICE,
  MUN_TO_ETH_RATE,
  SECTOR_A,
  SECTOR_B,
  deployFunded,
  deployLunarLease,
  ethers,
  fundMUN,
  networkHelpers,
  valueForMUN,
} from "./helpers.js";

const ATTACKER_TOP_UP = 1_000_000_000_000_000_000n;

async function deployUnderAttack() {
  const deployment = await deployLunarLease();

  const attacker = await ethers.deployContract(
    "ReentrantAttacker",
    [deployment.marketplaceAddress],
    deployment.carol,
  );

  await fundMUN(deployment.marketplace, deployment.alice, INITIAL_SECTOR_PRICE);
  await deployment.marketplace.connect(deployment.alice).acquireSector(SECTOR_B);

  await attacker.connect(deployment.carol).acquire(SECTOR_A, { value: ATTACKER_TOP_UP });

  return { ...deployment, attacker, attackerAddress: await attacker.getAddress() };
}

describe("Security — the attacker's funds live in MUN", () => {
  it("credits the attacker's top-up as MUN", async () => {
    const { marketplace, registry, attacker, attackerAddress } =
      await networkHelpers.loadFixture(deployUnderAttack);

    expect(await registry.ownerOf(SECTOR_A)).to.equal(attackerAddress);
    expect(await marketplace.getMUNBalance(attackerAddress)).to.equal(
      ATTACKER_TOP_UP * MUN_TO_ETH_RATE - INITIAL_SECTOR_PRICE,
    );
    expect(await attacker.reentryAttempts()).to.equal(0n);
  });
});

describe("Security — reentrancy on a POL payout", () => {
  it("rejects the re-entrant call and pays the recipient exactly once", async () => {
    const { marketplace, admin, attacker, attackerAddress, marketplaceAddress } =
      await networkHelpers.loadFixture(deployUnderAttack);

    const payout = ATTACKER_TOP_UP / 2n;
    const heldBefore = await ethers.provider.getBalance(marketplaceAddress);
    const platformBefore = await marketplace.platformBalance();

    await marketplace.connect(admin).withdrawPlatformFunds(attackerAddress, payout);

    expect(await attacker.reentryAttempts()).to.equal(1n);
    expect(await attacker.reentryRejected()).to.equal(true);

    expect(await ethers.provider.getBalance(attackerAddress)).to.equal(payout);
    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(heldBefore - payout);
    expect(await marketplace.platformBalance()).to.equal(platformBefore - payout);
  });

  it("reverts the whole payout when the attacker lets the re-entrant revert bubble up", async () => {
    const { marketplace, admin, attacker, attackerAddress, marketplaceAddress } =
      await networkHelpers.loadFixture(deployUnderAttack);

    await attacker.setSwallowReentryRevert(false);

    const heldBefore = await ethers.provider.getBalance(marketplaceAddress);
    const platformBefore = await marketplace.platformBalance();

    await expect(
      marketplace.connect(admin).withdrawPlatformFunds(attackerAddress, ATTACKER_TOP_UP / 2n),
    ).to.be.revertedWithCustomError(marketplace, "ReentrancyGuardReentrantCall");

    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(heldBefore);
    expect(await ethers.provider.getBalance(attackerAddress)).to.equal(0n);
    expect(await marketplace.platformBalance()).to.equal(platformBefore);
  });

  it("records every deposited POL as withdrawable platform revenue", async () => {
    const { marketplace, admin, attacker, attackerAddress, marketplaceAddress } =
      await networkHelpers.loadFixture(deployUnderAttack);

    await marketplace.connect(admin).withdrawPlatformFunds(attackerAddress, 1n);

    const held = await ethers.provider.getBalance(marketplaceAddress);

    expect(held).to.equal(valueForMUN(INITIAL_SECTOR_PRICE) + ATTACKER_TOP_UP - 1n);
    expect(await marketplace.platformBalance()).to.equal(held);
    expect(await attacker.reentryRejected()).to.equal(true);
  });
});

describe("Security — role boundaries", () => {
  it("keeps registry writes behind MARKETPLACE_ROLE", async () => {
    const { registry, marketplaceAddress, alice, bob } =
      await networkHelpers.loadFixture(deployLunarLease);

    const marketplaceRole = await registry.MARKETPLACE_ROLE();

    expect(await registry.hasRole(marketplaceRole, marketplaceAddress)).to.equal(true);
    expect(await registry.hasRole(marketplaceRole, alice.address)).to.equal(false);

    await expect(
      registry.connect(alice).mintSector(SECTOR_A, alice.address),
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    await expect(
      registry.connect(bob).setUser(SECTOR_A, bob.address, 1n),
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    await expect(
      registry.connect(bob).marketplaceTransfer(SECTOR_A, alice.address, bob.address),
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
  });

  it("does not let the registry admin mint without taking MARKETPLACE_ROLE first", async () => {
    const { registry, admin } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(
      registry.connect(admin).mintSector(SECTOR_A, admin.address),
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");

    expect(await registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(
      true,
    );
  });

  it("lets the admin revoke MARKETPLACE_ROLE from a retired marketplace", async () => {
    const { marketplace, registry, marketplaceAddress, admin, alice } =
      await networkHelpers.loadFixture(deployFunded);

    await registry
      .connect(admin)
      .revokeRole(await registry.MARKETPLACE_ROLE(), marketplaceAddress);

    await expect(
      marketplace.connect(alice).acquireSector(SECTOR_A),
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
  });
});
