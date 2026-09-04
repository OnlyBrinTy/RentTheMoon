import { expect } from "chai";
import { describe, it } from "mocha";

import {
  INITIAL_SECTOR_PRICE,
  SECTOR_A,
  TOP_UP_MUN,
  TOP_UP_VALUE,
  TOTAL_SECTORS,
  deployFunded,
  deployLunarLease,
  ethers,
  fundMUN,
  networkHelpers,
} from "./helpers.js";

describe("MoonMarketplace — primary acquisition", () => {
  it("mints a valid sector to the buyer and debits the price from their MUN balance", async () => {
    const { marketplace, registry, alice, marketplaceAddress } =
      await networkHelpers.loadFixture(deployFunded);

    const platformBefore = await marketplace.platformBalance();
    const heldBefore = await ethers.provider.getBalance(marketplaceAddress);

    await expect(marketplace.connect(alice).acquireSector(SECTOR_A))
      .to.emit(marketplace, "SectorAcquired")
      .withArgs(SECTOR_A, alice.address, INITIAL_SECTOR_PRICE);

    expect(await registry.ownerOf(SECTOR_A)).to.equal(alice.address);
    expect(await registry.exists(SECTOR_A)).to.equal(true);
    expect(await registry.totalSupply()).to.equal(1n);

    expect(await marketplace.getMUNBalance(alice.address)).to.equal(
      TOP_UP_MUN - INITIAL_SECTOR_PRICE,
    );
    expect(await marketplace.platformBalance()).to.equal(platformBefore);
    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(heldBefore);
  });

  it("burns the acquisition price rather than crediting it to any MUN balance", async () => {
    const { marketplace, alice, marketplaceAddress } =
      await networkHelpers.loadFixture(deployFunded);

    await marketplace.connect(alice).acquireSector(SECTOR_A);

    expect(await marketplace.getMUNBalance(marketplaceAddress)).to.equal(0n);
  });

  it("rejects a second acquisition of the same sector", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployFunded);

    await marketplace.connect(alice).acquireSector(SECTOR_A);

    await expect(marketplace.connect(bob).acquireSector(SECTOR_A))
      .to.be.revertedWithCustomError(marketplace, "SectorAlreadyClaimed")
      .withArgs(SECTOR_A);
  });

  it("rejects a MUN balance below the initial sector price", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    const funded = await fundMUN(marketplace, alice, INITIAL_SECTOR_PRICE - 10n);

    await expect(marketplace.connect(alice).acquireSector(SECTOR_A))
      .to.be.revertedWithCustomError(marketplace, "InsufficientPayment")
      .withArgs(INITIAL_SECTOR_PRICE, funded);
  });

  it("rejects an acquisition from an account that never topped up", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(marketplace.connect(alice).acquireSector(SECTOR_A))
      .to.be.revertedWithCustomError(marketplace, "InsufficientPayment")
      .withArgs(INITIAL_SECTOR_PRICE, 0n);
  });

  it("rejects a sector id outside the lunar grid", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployFunded);

    await expect(marketplace.connect(alice).acquireSector(TOTAL_SECTORS))
      .to.be.revertedWithCustomError(marketplace, "InvalidSector")
      .withArgs(TOTAL_SECTORS);

    await expect(
      marketplace.connect(alice).acquireSector(TOTAL_SECTORS + 1n),
    ).to.be.revertedWithCustomError(marketplace, "InvalidSector");
  });

  it("accepts the last valid sector id", async () => {
    const { marketplace, registry, alice } = await networkHelpers.loadFixture(deployFunded);

    const lastSector = TOTAL_SECTORS - 1n;
    await marketplace.connect(alice).acquireSector(lastSector);

    expect(await registry.ownerOf(lastSector)).to.equal(alice.address);
  });

  it("lets a single top-up fund several acquisitions", async () => {
    const { marketplace, registry, alice } = await networkHelpers.loadFixture(deployLunarLease);

    await fundMUN(marketplace, alice, INITIAL_SECTOR_PRICE * 3n);

    for (const sectorId of [1n, 2n, 3n]) {
      await marketplace.connect(alice).acquireSector(sectorId);
    }

    expect(await registry.balanceOf(alice.address)).to.equal(3n);
    expect(await marketplace.getMUNBalance(alice.address)).to.equal(0n);

    await expect(marketplace.connect(alice).acquireSector(4n)).to.be.revertedWithCustomError(
      marketplace,
      "InsufficientPayment",
    );
  });

  it("keeps the platform's POL holdings equal to everything topped up", async () => {
    const { marketplace, alice, bob, marketplaceAddress } =
      await networkHelpers.loadFixture(deployFunded);

    await marketplace.connect(alice).acquireSector(SECTOR_A);
    await marketplace.connect(bob).acquireSector(7n);

    expect(await marketplace.platformBalance()).to.equal(TOP_UP_VALUE * 3n);
    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(TOP_UP_VALUE * 3n);
  });

  it("reports unclaimed sectors through the aggregated read", async () => {
    const { marketplace } = await networkHelpers.loadFixture(deployLunarLease);

    const views = await marketplace.getSectors([SECTOR_A, 7n]);

    expect(views).to.have.length(2);
    expect(views[0]?.sectorId).to.equal(SECTOR_A);
    expect(views[0]?.minted).to.equal(false);
    expect(views[0]?.owner).to.equal(ethers.ZeroAddress);
    expect(views[1]?.minted).to.equal(false);
  });
});
