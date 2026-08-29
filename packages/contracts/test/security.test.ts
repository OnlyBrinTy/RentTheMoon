import { expect } from "chai";
import { describe, it } from "mocha";

import {
  INITIAL_SECTOR_PRICE,
  SECTOR_A,
  SECTOR_B,
  deployLunarLease,
  ethers,
  networkHelpers,
} from "./helpers.js";

const OVERPAYMENT = 1_000_000_000_000_000_000n;

async function deployUnderAttack() {
  const deployment = await deployLunarLease();

  const attacker = await ethers.deployContract(
    "ReentrantAttacker",
    [deployment.marketplaceAddress],
    deployment.carol,
  );

  await deployment.marketplace
    .connect(deployment.alice)
    .acquireSector(SECTOR_B, { value: INITIAL_SECTOR_PRICE });

  await attacker.connect(deployment.carol).acquire(SECTOR_A, {
    value: INITIAL_SECTOR_PRICE + OVERPAYMENT,
  });

  return { ...deployment, attacker, attackerAddress: await attacker.getAddress() };
}

describe("Security — reentrancy on withdrawRentalIncome", () => {
  it("rejects the re-entrant call and pays the attacker exactly once", async () => {
    const { marketplace, attacker, attackerAddress, marketplaceAddress } =
      await networkHelpers.loadFixture(deployUnderAttack);

    const marketplaceBefore = await ethers.provider.getBalance(marketplaceAddress);
    expect(await marketplace.claimableBalance(attackerAddress)).to.equal(OVERPAYMENT);

    await attacker.attack();

    expect(await attacker.reentryAttempts()).to.equal(1n);
    expect(await attacker.reentryRejected()).to.equal(true);

    expect(await ethers.provider.getBalance(attackerAddress)).to.equal(OVERPAYMENT);
    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(
      marketplaceBefore - OVERPAYMENT,
    );
    expect(await marketplace.claimableBalance(attackerAddress)).to.equal(0n);
    expect(await marketplace.platformBalance()).to.equal(INITIAL_SECTOR_PRICE * 2n);
  });

  it("reverts the whole withdrawal when the attacker lets the re-entrant revert bubble up", async () => {
    const { marketplace, attacker, attackerAddress, marketplaceAddress } =
      await networkHelpers.loadFixture(deployUnderAttack);

    await attacker.setSwallowReentryRevert(false);

    const marketplaceBefore = await ethers.provider.getBalance(marketplaceAddress);

    await expect(attacker.attack()).to.be.revertedWithCustomError(
      marketplace,
      "ReentrancyGuardReentrantCall",
    );

    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(marketplaceBefore);
    expect(await ethers.provider.getBalance(attackerAddress)).to.equal(0n);
    expect(await marketplace.claimableBalance(attackerAddress)).to.equal(OVERPAYMENT);
  });

  it("leaves every other balance untouched after the attack", async () => {
    const { marketplace, attacker, alice, marketplaceAddress } =
      await networkHelpers.loadFixture(deployUnderAttack);

    await attacker.attack();

    const solvency =
      (await marketplace.platformBalance()) + (await marketplace.claimableBalance(alice.address));
    const held = await ethers.provider.getBalance(marketplaceAddress);

    expect(held >= solvency).to.equal(true);
    expect(held).to.equal(INITIAL_SECTOR_PRICE * 2n);
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
    const { registry, marketplace, marketplaceAddress, admin, alice } =
      await networkHelpers.loadFixture(deployLunarLease);

    await registry
      .connect(admin)
      .revokeRole(await registry.MARKETPLACE_ROLE(), marketplaceAddress);

    await expect(
      marketplace.connect(alice).acquireSector(SECTOR_A, { value: INITIAL_SECTOR_PRICE }),
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
  });
});
