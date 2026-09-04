import { expect } from "chai";
import { describe, it } from "mocha";
import { SECTOR_A, SECTOR_B, deployLunarLease, ethers, networkHelpers } from "./helpers.js";

const TOP_UP = ethers.parseEther("1");
const PRICE_PER_DAY = ethers.parseEther("0.01");
const SALE_PRICE = ethers.parseEther("0.2");
const NO_EXPIRY = 0n;
const ONE_DAY = 86_400;

async function deployFunded() {
  const deployment = await deployLunarLease();
  const { marketplace, alice, bob, carol } = deployment;

  for (const account of [alice, bob, carol]) {
    await marketplace.connect(account).popUpBalance(account.address, { value: TOP_UP });
  }

  return deployment;
}

async function deployRentable() {
  const deployment = await deployFunded();
  const { marketplace, alice } = deployment;

  for (const sectorId of [SECTOR_A, SECTOR_B]) {
    await marketplace.connect(alice).acquireSector(sectorId);
    await marketplace.connect(alice).setRentalPrice(sectorId, PRICE_PER_DAY);
    await marketplace.connect(alice).setRentEnabled(sectorId, true);
  }

  return deployment;
}

describe("MoonLandRegistry — ownership periods", () => {
  it("opens an open-ended period on acquisition", async () => {
    const { registry, marketplace, alice } = await networkHelpers.loadFixture(deployFunded);

    await marketplace.connect(alice).acquireSector(SECTOR_A);

    const periods = await registry.getOwnershipPeriods(alice.address);

    expect(periods.length).to.equal(1);
    expect(periods[0].expiry).to.equal(NO_EXPIRY);
    expect(periods[0].start).to.equal(BigInt(await networkHelpers.time.latest()));
    expect(await registry.num_owned_sectors(alice.address)).to.equal(1n);
  });

  it("holds one open-ended period per owned sector", async () => {
    const { registry, alice } = await networkHelpers.loadFixture(deployRentable);

    const periods = await registry.getOwnershipPeriods(alice.address);

    expect(periods.length).to.equal(2);
    expect(periods.every((period) => period.expiry === NO_EXPIRY)).to.equal(true);
    expect(await registry.num_owned_sectors(alice.address)).to.equal(2n);
  });

  it("moves the open-ended period from seller to buyer on a sale", async () => {
    const { registry, marketplace, alice, bob } = await networkHelpers.loadFixture(deployRentable);

    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);
    await marketplace.connect(bob).buyListedSector(SECTOR_A);

    expect((await registry.getOwnershipPeriods(alice.address)).length).to.equal(1);
    expect(await registry.num_owned_sectors(alice.address)).to.equal(1n);

    const bought = await registry.getOwnershipPeriods(bob.address);

    expect(bought.length).to.equal(1);
    expect(bought[0].expiry).to.equal(NO_EXPIRY);
    expect(await registry.num_owned_sectors(bob.address)).to.equal(1n);
  });

  it("keeps counts and periods in step on a direct ERC-721 transfer", async () => {
    const { registry, alice, carol } = await networkHelpers.loadFixture(deployRentable);

    await registry.connect(alice).transferFrom(alice.address, carol.address, SECTOR_B);

    expect(await registry.num_owned_sectors(alice.address)).to.equal(1n);
    expect(await registry.num_owned_sectors(carol.address)).to.equal(1n);
    expect((await registry.getOwnershipPeriods(alice.address)).length).to.equal(1);
    expect((await registry.getOwnershipPeriods(carol.address)).length).to.equal(1);
  });

  it("records a rental as a period carrying its expiry", async () => {
    const { registry, marketplace, bob } = await networkHelpers.loadFixture(deployRentable);

    await marketplace.connect(bob).rentSector(SECTOR_A, 5n);

    const periods = await registry.getOwnershipPeriods(bob.address);

    expect(periods.length).to.equal(1);
    expect(periods[0].expiry).to.equal(await registry.userExpires(SECTOR_A));
    expect(periods[0].expiry - periods[0].start).to.equal(BigInt(5 * ONE_DAY));
  });

  it("holds one period per concurrently rented sector", async () => {
    const { registry, marketplace, bob } = await networkHelpers.loadFixture(deployRentable);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n);
    await marketplace.connect(bob).rentSector(SECTOR_B, 2n);

    const expiries = (await registry.getOwnershipPeriods(bob.address)).map(
      (period) => period.expiry,
    );

    expect(expiries.length).to.equal(2);
    expect(expiries).to.include(await registry.userExpires(SECTOR_A));
    expect(expiries).to.include(await registry.userExpires(SECTOR_B));
  });

  it("prunes elapsed rentals and leaves ownership alone", async () => {
    const { registry, marketplace, alice, bob } = await networkHelpers.loadFixture(deployRentable);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n);
    await marketplace.connect(bob).rentSector(SECTOR_B, 10n);

    const liveExpiry = await registry.userExpires(SECTOR_B);

    await networkHelpers.time.increase(ONE_DAY + 1);
    await registry.cleanExpiredPeriods(bob.address);
    await registry.cleanExpiredPeriods(alice.address);

    const rented = await registry.getOwnershipPeriods(bob.address);

    expect(rented.length).to.equal(1);
    expect(rented[0].expiry).to.equal(liveExpiry);
    expect((await registry.getOwnershipPeriods(alice.address)).length).to.equal(2);
  });

  it("moves the rental period to the new renter once the previous one elapsed", async () => {
    const { registry, marketplace, bob, carol } = await networkHelpers.loadFixture(deployRentable);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n);
    await networkHelpers.time.increase(ONE_DAY + 1);

    await marketplace.connect(carol).rentSector(SECTOR_A, 2n);

    expect((await registry.getOwnershipPeriods(bob.address)).length).to.equal(0);
    expect((await registry.getOwnershipPeriods(carol.address)).length).to.equal(1);
  });

  it("drops the rental period when the sector changes owner mid-rental", async () => {
    const { registry, marketplace, alice, bob, carol } =
      await networkHelpers.loadFixture(deployRentable);

    await marketplace.connect(bob).rentSector(SECTOR_A, 5n);
    expect((await registry.getOwnershipPeriods(bob.address)).length).to.equal(1);

    await registry.connect(alice).transferFrom(alice.address, carol.address, SECTOR_A);

    expect((await registry.getOwnershipPeriods(bob.address)).length).to.equal(0);
    expect(await registry.userExpires(SECTOR_A)).to.equal(0n);
  });
});
