import { expect } from "chai";
import { describe, it } from "mocha";

import {
  INITIAL_SECTOR_PRICE,
  SECTOR_A,
  TOP_UP_VALUE,
  ZERO_ADDRESS,
  beneficiaryShareOf,
  deployFunded,
  deployLunarLease,
  deployWithRentableSector,
  ethers,
  fundMUN,
  networkHelpers,
  platformFeeOf,
} from "./helpers.js";

describe("MoonMarketplace — rental proceeds", () => {
  it("credits the owner's MUN balance", async () => {
    const { marketplace, admin, alice, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const totalPrice = pricePerDay * 4n;
    const ownerBefore = await marketplace.getMUNBalance(alice.address);
    const treasuryBefore = await marketplace.getMUNBalance(admin.address);

    await marketplace.connect(bob).rentSector(SECTOR_A, 4n);

    expect((await marketplace.getMUNBalance(alice.address)) - ownerBefore).to.equal(
      beneficiaryShareOf(totalPrice),
    );
    expect((await marketplace.getMUNBalance(admin.address)) - treasuryBefore).to.equal(
      platformFeeOf(totalPrice),
    );
  });

  it("lets the owner move rental income on with sendMUN", async () => {
    const { marketplace, alice, bob, carol, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const totalPrice = pricePerDay * 4n;
    await marketplace.connect(bob).rentSector(SECTOR_A, 4n);

    const income = beneficiaryShareOf(totalPrice);
    const recipientBefore = await marketplace.getMUNBalance(carol.address);

    await marketplace.connect(alice).sendMUN(carol.address, income);

    expect((await marketplace.getMUNBalance(carol.address)) - recipientBefore).to.equal(income);
  });

  it("never sends POL to users when MUN changes hands", async () => {
    const { marketplace, bob, carol, pricePerDay, marketplaceAddress } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const heldBefore = await ethers.provider.getBalance(marketplaceAddress);

    await marketplace.connect(bob).acquireSector(42n);
    await marketplace.connect(carol).rentSector(SECTOR_A, 1n);
    await marketplace.connect(bob).listForSale(42n, pricePerDay);
    await marketplace.connect(carol).buyListedSector(42n);

    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(heldBefore);
  });
});

describe("MoonMarketplace — platform treasury", () => {
  it("lets TREASURY_ROLE move accrued POL out", async () => {
    const { marketplace, admin, alice, carol } =
      await networkHelpers.loadFixture(deployLunarLease);

    await fundMUN(marketplace, alice, INITIAL_SECTOR_PRICE);
    const available = await marketplace.platformBalance();

    await expect(marketplace.connect(admin).withdrawPlatformFunds(carol.address, available))
      .to.emit(marketplace, "PlatformFundsWithdrawn")
      .withArgs(carol.address, available);

    expect(await marketplace.platformBalance()).to.equal(0n);
  });

  it("treats every top-up as platform revenue", async () => {
    const { marketplace, marketplaceAddress } = await networkHelpers.loadFixture(deployFunded);

    expect(await marketplace.platformBalance()).to.equal(TOP_UP_VALUE * 3n);
    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(TOP_UP_VALUE * 3n);
  });

  it("rejects a platform withdrawal from an account without TREASURY_ROLE", async () => {
    const { marketplace, bob } = await networkHelpers.loadFixture(deployFunded);

    await expect(marketplace.connect(bob).withdrawPlatformFunds(bob.address, 1n))
      .to.be.revertedWithCustomError(marketplace, "AccessControlUnauthorizedAccount")
      .withArgs(bob.address, await marketplace.TREASURY_ROLE());
  });

  it("cannot withdraw more POL than was ever deposited", async () => {
    const { marketplace, admin, bob, treasury } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n);

    const available = await marketplace.platformBalance();

    await expect(
      marketplace.connect(admin).withdrawPlatformFunds(treasury.address, available + 1n),
    )
      .to.be.revertedWithCustomError(marketplace, "InsufficientPlatformBalance")
      .withArgs(available + 1n, available);
  });

  it("does not grow the withdrawable POL when MUN changes hands", async () => {
    const { marketplace, admin, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const before = await marketplace.platformBalance();
    const treasuryBefore = await marketplace.getMUNBalance(admin.address);

    await marketplace.connect(bob).rentSector(SECTOR_A, 3n);

    expect(await marketplace.platformBalance()).to.equal(before);
    expect((await marketplace.getMUNBalance(admin.address)) - treasuryBefore).to.equal(
      platformFeeOf(pricePerDay * 3n),
    );
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

    await fundMUN(marketplace, alice, INITIAL_SECTOR_PRICE);
    await marketplace.connect(admin).grantRole(await marketplace.TREASURY_ROLE(), treasury.address);

    const available = await marketplace.platformBalance();

    await expect(
      marketplace.connect(treasury).withdrawPlatformFunds(treasury.address, available),
    ).to.changeEtherBalance(ethers, treasury, available);
  });

  it("lets the admin retarget platform MUN fees", async () => {
    const { marketplace, admin, treasury, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await expect(marketplace.connect(admin).setTreasury(treasury.address))
      .to.emit(marketplace, "TreasuryChanged")
      .withArgs(admin.address, treasury.address);

    expect(await marketplace.treasury()).to.equal(treasury.address);

    const treasuryBefore = await marketplace.getMUNBalance(treasury.address);
    await marketplace.connect(bob).rentSector(SECTOR_A, 2n);

    expect((await marketplace.getMUNBalance(treasury.address)) - treasuryBefore).to.equal(
      platformFeeOf(pricePerDay * 2n),
    );
  });

  it("rejects a zero treasury address", async () => {
    const { marketplace, admin } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(
      marketplace.connect(admin).setTreasury(ZERO_ADDRESS),
    ).to.be.revertedWithCustomError(marketplace, "ZeroAddress");
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
