import { expect } from "chai";
import { describe, it } from "mocha";

import {
  INITIAL_SECTOR_PRICE,
  SECTOR_A,
  TOTAL_SECTORS,
  deployLunarLease,
  ethers,
  networkHelpers,
} from "./helpers.js";

describe("MoonMarketplace — primary acquisition", () => {
  it("mints a valid sector to the buyer and accrues the price to the platform", async () => {
    const { marketplace, registry, alice, marketplaceAddress } =
      await networkHelpers.loadFixture(deployLunarLease);

    await expect(marketplace.connect(alice).acquireSector(SECTOR_A, { value: INITIAL_SECTOR_PRICE }))
      .to.emit(marketplace, "SectorAcquired")
      .withArgs(SECTOR_A, alice.address, INITIAL_SECTOR_PRICE);

    expect(await registry.ownerOf(SECTOR_A)).to.equal(alice.address);
    expect(await registry.exists(SECTOR_A)).to.equal(true);
    expect(await registry.totalSupply()).to.equal(1n);
    expect(await marketplace.platformBalance()).to.equal(INITIAL_SECTOR_PRICE);
    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(INITIAL_SECTOR_PRICE);
  });

  it("rejects a second acquisition of the same sector", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployLunarLease);

    await marketplace.connect(alice).acquireSector(SECTOR_A, { value: INITIAL_SECTOR_PRICE });

    await expect(
      marketplace.connect(bob).acquireSector(SECTOR_A, { value: INITIAL_SECTOR_PRICE }),
    )
      .to.be.revertedWithCustomError(marketplace, "SectorAlreadyClaimed")
      .withArgs(SECTOR_A);
  });

  it("rejects payment below the initial sector price", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    const underpayment = INITIAL_SECTOR_PRICE - 1n;

    await expect(marketplace.connect(alice).acquireSector(SECTOR_A, { value: underpayment }))
      .to.be.revertedWithCustomError(marketplace, "InsufficientPayment")
      .withArgs(INITIAL_SECTOR_PRICE, underpayment);
  });

  it("rejects a sector id outside the lunar grid", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(
      marketplace.connect(alice).acquireSector(TOTAL_SECTORS, { value: INITIAL_SECTOR_PRICE }),
    )
      .to.be.revertedWithCustomError(marketplace, "InvalidSector")
      .withArgs(TOTAL_SECTORS);

    await expect(
      marketplace.connect(alice).acquireSector(TOTAL_SECTORS + 1n, { value: INITIAL_SECTOR_PRICE }),
    ).to.be.revertedWithCustomError(marketplace, "InvalidSector");
  });

  it("accepts the last valid sector id", async () => {
    const { marketplace, registry, alice } = await networkHelpers.loadFixture(deployLunarLease);

    const lastSector = TOTAL_SECTORS - 1n;
    await marketplace.connect(alice).acquireSector(lastSector, { value: INITIAL_SECTOR_PRICE });

    expect(await registry.ownerOf(lastSector)).to.equal(alice.address);
  });

  it("credits overpayment to the payer instead of refunding it inline", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    const overpayment = 40_000_000_000_000_000n;

    await marketplace
      .connect(alice)
      .acquireSector(SECTOR_A, { value: INITIAL_SECTOR_PRICE + overpayment });

    expect(await marketplace.claimableBalance(alice.address)).to.equal(overpayment);
    expect(await marketplace.platformBalance()).to.equal(INITIAL_SECTOR_PRICE);
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
