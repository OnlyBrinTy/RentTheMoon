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
  networkHelpers,
  platformFeeOf,
  time,
} from "./helpers.js";

async function rentAt(
  rent: (value: bigint) => Promise<unknown>,
  startAt: number,
  value: bigint,
): Promise<bigint> {
  await time.setNextBlockTimestamp(startAt);
  await rent(value);
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
  it("assigns ERC-4907 usage rights and splits the proceeds", async () => {
    const { marketplace, registry, alice, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const numberOfDays = 3n;
    const totalPrice = pricePerDay * numberOfDays;
    const startAt = (await time.latest()) + 60;
    await time.setNextBlockTimestamp(startAt);

    const expiresAt = BigInt(startAt) + numberOfDays * SECONDS_PER_DAY;

    await expect(marketplace.connect(bob).rentSector(SECTOR_A, numberOfDays, { value: totalPrice }))
      .to.emit(marketplace, "SectorRented")
      .withArgs(SECTOR_A, bob.address, expiresAt, totalPrice);

    expect(await registry.userOf(SECTOR_A)).to.equal(bob.address);
    expect(await registry.userExpires(SECTOR_A)).to.equal(expiresAt);
    expect(await registry.ownerOf(SECTOR_A)).to.equal(alice.address);

    expect(await marketplace.claimableBalance(alice.address)).to.equal(
      beneficiaryShareOf(totalPrice),
    );
    expect(await marketplace.claimableBalance(bob.address)).to.equal(0n);
  });

  it("credits exactly 97% to the owner and 3% to the platform", async () => {
    const { marketplace, alice, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const platformBefore = await marketplace.platformBalance();
    const totalPrice = pricePerDay * 2n;

    await marketplace.connect(bob).rentSector(SECTOR_A, 2n, { value: totalPrice });

    const fee = platformFeeOf(totalPrice);

    expect(fee).to.equal(3_000_000_000_000_000n);
    expect(await marketplace.claimableBalance(alice.address)).to.equal(97_000_000_000_000_000n);
    expect((await marketplace.platformBalance()) - platformBefore).to.equal(fee);
  });

  it("truncates the platform fee down on indivisible amounts", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployWithRentableSector);

    const pricePerDay = 1_234_567n;
    await marketplace.connect(alice).setRentalPrice(SECTOR_A, pricePerDay);

    const platformBefore = await marketplace.platformBalance();
    await marketplace.connect(bob).rentSector(SECTOR_A, 1n, { value: pricePerDay });

    expect((await marketplace.platformBalance()) - platformBefore).to.equal(37_037n);
    expect(await marketplace.claimableBalance(alice.address)).to.equal(1_197_530n);
  });

  it("credits rental overpayment back to the renter", async () => {
    const { marketplace, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const overpayment = 7n;
    await marketplace.connect(bob).rentSector(SECTOR_A, 1n, { value: pricePerDay + overpayment });

    expect(await marketplace.claimableBalance(bob.address)).to.equal(overpayment);
  });

  it("rejects payment below the total rental price", async () => {
    const { marketplace, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const totalPrice = pricePerDay * 2n;

    await expect(marketplace.connect(bob).rentSector(SECTOR_A, 2n, { value: totalPrice - 1n }))
      .to.be.revertedWithCustomError(marketplace, "InsufficientPayment")
      .withArgs(totalPrice, totalPrice - 1n);
  });

  it("rejects renting a sector whose owner has not opened it", async () => {
    const { marketplace, alice, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(alice).setRentEnabled(SECTOR_A, false);

    await expect(marketplace.connect(bob).rentSector(SECTOR_A, 1n, { value: pricePerDay }))
      .to.be.revertedWithCustomError(marketplace, "RentNotEnabled")
      .withArgs(SECTOR_A);
  });

  it("rejects renting an unminted sector", async () => {
    const { marketplace, bob } = await networkHelpers.loadFixture(deployWithRentableSector);

    await expect(marketplace.connect(bob).rentSector(SECTOR_B, 1n, { value: 0n }))
      .to.be.revertedWithCustomError(marketplace, "SectorNotMinted")
      .withArgs(SECTOR_B);
  });

  it("rejects durations outside one to 365 days", async () => {
    const { marketplace, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await expect(marketplace.connect(bob).rentSector(SECTOR_A, 0n, { value: 0n }))
      .to.be.revertedWithCustomError(marketplace, "InvalidDuration")
      .withArgs(0n);

    await expect(
      marketplace.connect(bob).rentSector(SECTOR_A, 366n, { value: pricePerDay * 366n }),
    )
      .to.be.revertedWithCustomError(marketplace, "InvalidDuration")
      .withArgs(366n);
  });

  it("accepts the maximum rental duration", async () => {
    const { marketplace, registry, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const startAt = (await time.latest()) + 60;
    await time.setNextBlockTimestamp(startAt);
    await marketplace.connect(bob).rentSector(SECTOR_A, 365n, { value: pricePerDay * 365n });

    expect(await registry.userExpires(SECTOR_A)).to.equal(
      BigInt(startAt) + 365n * SECONDS_PER_DAY,
    );
  });

  it("rejects a second rental while usage rights are held", async () => {
    const { marketplace, bob, carol, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(bob).rentSector(SECTOR_A, 5n, { value: pricePerDay * 5n });

    await expect(marketplace.connect(carol).rentSector(SECTOR_A, 1n, { value: pricePerDay }))
      .to.be.revertedWithCustomError(marketplace, "AlreadyRented")
      .withArgs(SECTOR_A);
  });

  it("rejects the owner renting their own sector", async () => {
    const { marketplace, alice, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await expect(marketplace.connect(alice).rentSector(SECTOR_A, 1n, { value: pricePerDay }))
      .to.be.revertedWithCustomError(marketplace, "CannotRentOwnSector")
      .withArgs(SECTOR_A);
  });
});

describe("MoonMarketplace — rental expiry", () => {
  it("clears the ERC-4907 user at the exact expiry second with no transaction", async () => {
    const { marketplace, registry, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const startAt = (await time.latest()) + 60;
    const expiresAt = await rentAt(
      (value) => marketplace.connect(bob).rentSector(SECTOR_A, 1n, { value }),
      startAt,
      pricePerDay,
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
    const { marketplace, registry, bob, carol, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    const startAt = (await time.latest()) + 60;
    const rentedAt = await rentAt(
      (value) => marketplace.connect(bob).rentSector(SECTOR_A, 1n, { value }),
      startAt,
      pricePerDay,
    );
    const expiry = rentedAt + SECONDS_PER_DAY;

    await time.setNextBlockTimestamp(expiry);
    await expect(
      marketplace.connect(carol).rentSector(SECTOR_A, 1n, { value: pricePerDay }),
    ).to.be.revertedWithCustomError(marketplace, "AlreadyRented");

    await time.setNextBlockTimestamp(expiry + 2n);
    await marketplace.connect(carol).rentSector(SECTOR_A, 1n, { value: pricePerDay });

    expect(await registry.userOf(SECTOR_A)).to.equal(carol.address);
    expect(await registry.userExpires(SECTOR_A)).to.equal(expiry + 2n + SECONDS_PER_DAY);
  });

  it("reports the lapsed rental through the aggregated read", async () => {
    const { marketplace, bob, pricePerDay } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n, { value: pricePerDay });

    const during = await marketplace.getSector(SECTOR_A);
    expect(during.user).to.equal(bob.address);

    await time.increase(SECONDS_PER_DAY + 1n);

    const after = await marketplace.getSector(SECTOR_A);
    expect(after.user).to.equal(ZERO_ADDRESS);
    expect(after.userExpires).to.equal(during.userExpires);
  });
});
