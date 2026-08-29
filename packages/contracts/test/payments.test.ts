import { expect } from "chai";
import { describe, it } from "mocha";

import {
  INITIAL_SECTOR_PRICE,
  SECTOR_A,
  ZERO_ADDRESS,
  beneficiaryShareOf,
  deployLunarLease,
  deployWithRentableSector,
  ethers,
  networkHelpers,
} from "./helpers.js";

describe("MoonMarketplace — pull payments", () => {
  it("pays out the caller's balance and zeroes it", async () => {
    const { marketplace, alice, bob, pricePerDay, marketplaceAddress } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const totalPrice = pricePerDay * 4n;
    await marketplace.connect(bob).rentSector(SECTOR_A, 4n, { value: totalPrice });

    const owed = beneficiaryShareOf(totalPrice);
    expect(await marketplace.claimableBalance(alice.address)).to.equal(owed);

    await expect(marketplace.connect(alice).withdrawRentalIncome())
      .to.emit(marketplace, "RentalIncomeWithdrawn")
      .withArgs(alice.address, owed);

    expect(await marketplace.claimableBalance(alice.address)).to.equal(0n);
    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(
      INITIAL_SECTOR_PRICE + totalPrice - owed,
    );
  });

  it("moves the exact balance to the caller's wallet", async () => {
    const { marketplace, alice, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const totalPrice = pricePerDay * 4n;
    await marketplace.connect(bob).rentSector(SECTOR_A, 4n, { value: totalPrice });

    await expect(marketplace.connect(alice).withdrawRentalIncome()).to.changeEtherBalance(
      ethers,
      alice,
      beneficiaryShareOf(totalPrice),
    );
  });

  it("rejects a withdrawal with nothing owed", async () => {
    const { marketplace, carol } = await networkHelpers.loadFixture(deployWithRentableSector);

    await expect(
      marketplace.connect(carol).withdrawRentalIncome(),
    ).to.be.revertedWithCustomError(marketplace, "NothingToWithdraw");
  });

  it("rejects a second withdrawal of the same balance", async () => {
    const { marketplace, alice, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n, { value: pricePerDay });
    await marketplace.connect(alice).withdrawRentalIncome();

    await expect(
      marketplace.connect(alice).withdrawRentalIncome(),
    ).to.be.revertedWithCustomError(marketplace, "NothingToWithdraw");
  });
});

describe("MoonMarketplace — platform treasury", () => {
  it("lets TREASURY_ROLE move accrued fees out", async () => {
    const { marketplace, admin, alice, carol } =
      await networkHelpers.loadFixture(deployLunarLease);

    await marketplace.connect(alice).acquireSector(SECTOR_A, { value: INITIAL_SECTOR_PRICE });

    await expect(
      marketplace.connect(admin).withdrawPlatformFunds(carol.address, INITIAL_SECTOR_PRICE),
    )
      .to.emit(marketplace, "PlatformFundsWithdrawn")
      .withArgs(carol.address, INITIAL_SECTOR_PRICE);

    expect(await marketplace.platformBalance()).to.equal(0n);
  });

  it("rejects a platform withdrawal from an account without TREASURY_ROLE", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployLunarLease);

    await marketplace.connect(alice).acquireSector(SECTOR_A, { value: INITIAL_SECTOR_PRICE });

    await expect(
      marketplace.connect(bob).withdrawPlatformFunds(bob.address, INITIAL_SECTOR_PRICE),
    )
      .to.be.revertedWithCustomError(marketplace, "AccessControlUnauthorizedAccount")
      .withArgs(bob.address, await marketplace.TREASURY_ROLE());

    await expect(
      marketplace.connect(alice).withdrawPlatformFunds(alice.address, 1n),
    ).to.be.revertedWithCustomError(marketplace, "AccessControlUnauthorizedAccount");
  });

  it("cannot reach into balances owed to users", async () => {
    const { marketplace, admin, bob, pricePerDay, treasury } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n, { value: pricePerDay });

    const available = await marketplace.platformBalance();

    await expect(
      marketplace.connect(admin).withdrawPlatformFunds(treasury.address, available + 1n),
    )
      .to.be.revertedWithCustomError(marketplace, "InsufficientPlatformBalance")
      .withArgs(available + 1n, available);
  });

  it("rejects zero-value and zero-address platform withdrawals", async () => {
    const { marketplace, admin, treasury } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(
      marketplace.connect(admin).withdrawPlatformFunds(ZERO_ADDRESS, 1n),
    ).to.be.revertedWithCustomError(marketplace, "ZeroAddress");

    await expect(
      marketplace.connect(admin).withdrawPlatformFunds(treasury.address, 0n),
    ).to.be.revertedWithCustomError(marketplace, "NothingToWithdraw");
  });

  it("can delegate TREASURY_ROLE to a dedicated account", async () => {
    const { marketplace, admin, alice, treasury } =
      await networkHelpers.loadFixture(deployLunarLease);

    await marketplace.connect(alice).acquireSector(SECTOR_A, { value: INITIAL_SECTOR_PRICE });
    await marketplace.connect(admin).grantRole(await marketplace.TREASURY_ROLE(), treasury.address);

    await expect(
      marketplace.connect(treasury).withdrawPlatformFunds(treasury.address, INITIAL_SECTOR_PRICE),
    ).to.changeEtherBalance(ethers, treasury, INITIAL_SECTOR_PRICE);
  });
});

describe("MoonMarketplace — admin configuration", () => {
  it("lets the admin reprice the primary market", async () => {
    const { marketplace, admin } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(marketplace.connect(admin).setInitialSectorPrice(1n))
      .to.emit(marketplace, "InitialSectorPriceChanged")
      .withArgs(1n);

    expect(await marketplace.initialSectorPrice()).to.equal(1n);
  });

  it("rejects repricing from a non-admin", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(
      marketplace.connect(alice).setInitialSectorPrice(1n),
    ).to.be.revertedWithCustomError(marketplace, "AccessControlUnauthorizedAccount");
  });

  it("lets the admin change the fee up to the hard cap", async () => {
    const { marketplace, admin } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(marketplace.connect(admin).setPlatformFeeBps(1_000))
      .to.emit(marketplace, "PlatformFeeBpsChanged")
      .withArgs(1_000);

    expect(await marketplace.platformFeeBps()).to.equal(1_000);
  });

  it("rejects a fee above the hard cap", async () => {
    const { marketplace, admin } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(marketplace.connect(admin).setPlatformFeeBps(1_001))
      .to.be.revertedWithCustomError(marketplace, "FeeTooHigh")
      .withArgs(1_001, 1_000);
  });

  it("rejects a fee change from a non-admin", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(
      marketplace.connect(alice).setPlatformFeeBps(0),
    ).to.be.revertedWithCustomError(marketplace, "AccessControlUnauthorizedAccount");
  });

  it("refuses to deploy with a fee above the hard cap or a zero address", async () => {
    const { registryAddress, admin } = await networkHelpers.loadFixture(deployLunarLease);

    const factory = await ethers.getContractFactory("MoonMarketplace", admin);

    await expect(
      factory.deploy(registryAddress, INITIAL_SECTOR_PRICE, 1_001, admin.address),
    ).to.be.revertedWithCustomError(factory, "FeeTooHigh");

    await expect(
      factory.deploy(ZERO_ADDRESS, INITIAL_SECTOR_PRICE, 300, admin.address),
    ).to.be.revertedWithCustomError(factory, "ZeroAddress");
  });
});
