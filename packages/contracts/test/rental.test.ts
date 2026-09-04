import { expect } from "chai";
import { describe, it } from "mocha";

import {
  SECONDS_PER_DAY,
  SECTOR_A,
  SECTOR_B,
  ZERO_ADDRESS,
  beneficiaryShareOf,
  deployWithOwnedSector,
  deployWithRentableSector,
  ethers,
  fundMUN,
  networkHelpers,
  platformFeeOf,
  time,
} from "./helpers.js";

async function rentAt(rent: () => Promise<unknown>, startAt: number): Promise<bigint> {
  await time.setNextBlockTimestamp(startAt);
  await rent();
  return BigInt(startAt);
}

describe("MoonMarketplace — rental configuration", () => {
  it("lets the sector owner set the daily price", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(marketplace.connect(alice).setRentalPrice(SECTOR_A, 123n))
      .to.emit(marketplace, "RentalPriceChanged")
      .withArgs(SECTOR_A, 123n);

    expect((await marketplace.getSector(SECTOR_A)).pricePerDay).to.equal(123n);
  });

  it("rejects a price change from anyone but the owner", async () => {
    const { marketplace, bob, admin } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(marketplace.connect(bob).setRentalPrice(SECTOR_A, 123n))
      .to.be.revertedWithCustomError(marketplace, "NotSectorOwner")
      .withArgs(SECTOR_A, bob.address);

    await expect(
      marketplace.connect(admin).setRentalPrice(SECTOR_A, 123n),
    ).to.be.revertedWithCustomError(marketplace, "NotSectorOwner");
  });

  it("rejects configuration of a sector nobody owns", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(marketplace.connect(alice).setRentalPrice(SECTOR_B, 123n))
      .to.be.revertedWithCustomError(marketplace, "SectorNotMinted")
      .withArgs(SECTOR_B);
  });

  it("lets the owner open and close the sector to renters", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(marketplace.connect(alice).setRentEnabled(SECTOR_A, true))
      .to.emit(marketplace, "RentAvailabilityChanged")
      .withArgs(SECTOR_A, true);
    expect((await marketplace.getSector(SECTOR_A)).rentEnabled).to.equal(true);

    await expect(marketplace.connect(alice).setRentEnabled(SECTOR_A, false))
      .to.emit(marketplace, "RentAvailabilityChanged")
      .withArgs(SECTOR_A, false);
    expect((await marketplace.getSector(SECTOR_A)).rentEnabled).to.equal(false);
  });

  it("rejects an availability change from anyone but the owner", async () => {
    const { marketplace, bob } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(
      marketplace.connect(bob).setRentEnabled(SECTOR_A, true),
    ).to.be.revertedWithCustomError(marketplace, "NotSectorOwner");
  });
});

describe("MoonMarketplace — renting", () => {
  it("assigns ERC-4907 usage rights and splits the proceeds in MUN", async () => {
    const { marketplace, registry, admin, alice, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const numberOfDays = 3n;
    const totalPrice = pricePerDay * numberOfDays;
    const ownerBefore = await marketplace.getMUNBalance(alice.address);
    const renterBefore = await marketplace.getMUNBalance(bob.address);
    const treasuryBefore = await marketplace.getMUNBalance(admin.address);

    const startAt = (await time.latest()) + 60;
    await time.setNextBlockTimestamp(startAt);

    const expiresAt = BigInt(startAt) + numberOfDays * SECONDS_PER_DAY;

    await expect(marketplace.connect(bob).rentSector(SECTOR_A, numberOfDays))
      .to.emit(marketplace, "SectorRented")
      .withArgs(SECTOR_A, bob.address, expiresAt, totalPrice);

    expect(await registry.userOf(SECTOR_A)).to.equal(bob.address);
    expect(await registry.userExpires(SECTOR_A)).to.equal(expiresAt);
    expect(await registry.ownerOf(SECTOR_A)).to.equal(alice.address);

    expect((await marketplace.getMUNBalance(alice.address)) - ownerBefore).to.equal(
      beneficiaryShareOf(totalPrice),
    );
    expect(renterBefore - (await marketplace.getMUNBalance(bob.address))).to.equal(totalPrice);
    expect((await marketplace.getMUNBalance(admin.address)) - treasuryBefore).to.equal(
      platformFeeOf(totalPrice),
    );
  });

  it("credits exactly 97% to the owner and 3% to the platform", async () => {
    const { marketplace, admin, alice, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const ownerBefore = await marketplace.getMUNBalance(alice.address);
    const treasuryBefore = await marketplace.getMUNBalance(admin.address);
    const totalPrice = pricePerDay * 2n;

    await marketplace.connect(bob).rentSector(SECTOR_A, 2n);

    const fee = platformFeeOf(totalPrice);

    expect(fee).to.equal(3_000_000_000_000_000n);
    expect((await marketplace.getMUNBalance(alice.address)) - ownerBefore).to.equal(
      97_000_000_000_000_000n,
    );
    expect((await marketplace.getMUNBalance(admin.address)) - treasuryBefore).to.equal(fee);
  });

  it("leaves the native POL holdings and platform balance untouched", async () => {
    const { marketplace, bob, marketplaceAddress } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const platformBefore = await marketplace.platformBalance();
    const heldBefore = await ethers.provider.getBalance(marketplaceAddress);

    await marketplace.connect(bob).rentSector(SECTOR_A, 2n);

    expect(await marketplace.platformBalance()).to.equal(platformBefore);
    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(heldBefore);
  });

  it("truncates the platform fee down on indivisible amounts", async () => {
    const { marketplace, admin, alice, bob } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const pricePerDay = 1_234_567n;
    await marketplace.connect(alice).setRentalPrice(SECTOR_A, pricePerDay);

    const ownerBefore = await marketplace.getMUNBalance(alice.address);
    const treasuryBefore = await marketplace.getMUNBalance(admin.address);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n);

    expect((await marketplace.getMUNBalance(admin.address)) - treasuryBefore).to.equal(
      37_037n,
    );
    expect((await marketplace.getMUNBalance(alice.address)) - ownerBefore).to.equal(1_197_530n);
  });

  it("debits the renter exactly the total price and leaves the remainder spendable", async () => {
    const { marketplace, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const before = await marketplace.getMUNBalance(bob.address);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n);

    expect(await marketplace.getMUNBalance(bob.address)).to.equal(before - pricePerDay);
  });

  it("rejects a MUN balance below the total rental price", async () => {
    const { marketplace, treasury, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const totalPrice = pricePerDay * 2n;
    const funded = await fundMUN(marketplace, treasury, totalPrice - 10n);

    await expect(marketplace.connect(treasury).rentSector(SECTOR_A, 2n))
      .to.be.revertedWithCustomError(marketplace, "InsufficientPayment")
      .withArgs(totalPrice, funded);
  });

  it("rejects renting from an account that never topped up", async () => {
    const { marketplace, treasury, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await expect(marketplace.connect(treasury).rentSector(SECTOR_A, 1n))
      .to.be.revertedWithCustomError(marketplace, "InsufficientPayment")
      .withArgs(pricePerDay, 0n);
  });

  it("rejects renting a sector whose owner has not opened it", async () => {
    const { marketplace, alice, bob } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(alice).setRentEnabled(SECTOR_A, false);

    await expect(marketplace.connect(bob).rentSector(SECTOR_A, 1n))
      .to.be.revertedWithCustomError(marketplace, "RentNotEnabled")
      .withArgs(SECTOR_A);
  });

  it("rejects renting an unminted sector", async () => {
    const { marketplace, bob } = await networkHelpers.loadFixture(deployWithRentableSector);

    await expect(marketplace.connect(bob).rentSector(SECTOR_B, 1n))
      .to.be.revertedWithCustomError(marketplace, "SectorNotMinted")
      .withArgs(SECTOR_B);
  });

  it("rejects durations outside one to 365 days", async () => {
    const { marketplace, bob } = await networkHelpers.loadFixture(deployWithRentableSector);

    await expect(marketplace.connect(bob).rentSector(SECTOR_A, 0n))
      .to.be.revertedWithCustomError(marketplace, "InvalidDuration")
      .withArgs(0n);

    await expect(marketplace.connect(bob).rentSector(SECTOR_A, 366n))
      .to.be.revertedWithCustomError(marketplace, "InvalidDuration")
      .withArgs(366n);
  });

  it("accepts the maximum rental duration", async () => {
    const { marketplace, registry, bob } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const startAt = (await time.latest()) + 60;
    await time.setNextBlockTimestamp(startAt);
    await marketplace.connect(bob).rentSector(SECTOR_A, 365n);

    expect(await registry.userExpires(SECTOR_A)).to.equal(
      BigInt(startAt) + 365n * SECONDS_PER_DAY,
    );
  });

  it("rejects a second rental while usage rights are held", async () => {
    const { marketplace, bob, carol } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(bob).rentSector(SECTOR_A, 5n);

    await expect(marketplace.connect(carol).rentSector(SECTOR_A, 1n))
      .to.be.revertedWithCustomError(marketplace, "AlreadyRented")
      .withArgs(SECTOR_A);
  });

  it("rejects the owner renting their own sector", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployWithRentableSector);

    await expect(marketplace.connect(alice).rentSector(SECTOR_A, 1n))
      .to.be.revertedWithCustomError(marketplace, "CannotRentOwnSector")
      .withArgs(SECTOR_A);
  });
});

describe("MoonMarketplace — rental expiry", () => {
  it("clears the ERC-4907 user at the exact expiry second with no transaction", async () => {
    const { marketplace, registry, bob } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const startAt = (await time.latest()) + 60;
    const expiresAt = await rentAt(
      () => marketplace.connect(bob).rentSector(SECTOR_A, 1n),
      startAt,
    );
    const expiry = expiresAt + SECONDS_PER_DAY;

    await time.setNextBlockTimestamp(expiry - 1n);
    await networkHelpers.mine();
    expect(await time.latest()).to.equal(expiry - 1n);
    expect(await registry.userOf(SECTOR_A)).to.equal(bob.address);

    await time.setNextBlockTimestamp(expiry);
    await networkHelpers.mine();
    expect(await time.latest()).to.equal(expiry);
    expect(await registry.userOf(SECTOR_A)).to.equal(ZERO_ADDRESS);

    await time.setNextBlockTimestamp(expiry + 1n);
    await networkHelpers.mine();
    expect(await registry.userOf(SECTOR_A)).to.equal(ZERO_ADDRESS);

    expect(await registry.userExpires(SECTOR_A)).to.equal(expiry);
  });

  it("keeps the sector rentable-blocked at the expiry second and free one second later", async () => {
    const { marketplace, registry, bob, carol } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const startAt = (await time.latest()) + 60;
    const rentedAt = await rentAt(
      () => marketplace.connect(bob).rentSector(SECTOR_A, 1n),
      startAt,
    );
    const expiry = rentedAt + SECONDS_PER_DAY;

    await time.setNextBlockTimestamp(expiry);
    await expect(
      marketplace.connect(carol).rentSector(SECTOR_A, 1n),
    ).to.be.revertedWithCustomError(marketplace, "AlreadyRented");

    await time.setNextBlockTimestamp(expiry + 2n);
    await marketplace.connect(carol).rentSector(SECTOR_A, 1n);

    expect(await registry.userOf(SECTOR_A)).to.equal(carol.address);
    expect(await registry.userExpires(SECTOR_A)).to.equal(expiry + 2n + SECONDS_PER_DAY);
  });

  it("reports the lapsed rental through the aggregated read", async () => {
    const { marketplace, bob } = await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n);

    const during = await marketplace.getSector(SECTOR_A);
    expect(during.user).to.equal(bob.address);

    await time.increase(SECONDS_PER_DAY + 1n);

    const after = await marketplace.getSector(SECTOR_A);
    expect(after.user).to.equal(ZERO_ADDRESS);
    expect(after.userExpires).to.equal(during.userExpires);
  });
});
