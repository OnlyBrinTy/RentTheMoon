import { expect } from "chai";
import { describe, it } from "mocha";
import { SECTOR_A, SECTOR_B, deployLunarLease, ethers, networkHelpers } from "./helpers.js";

const TOP_UP = ethers.parseEther("1");
const PRICE_PER_DAY = ethers.parseEther("0.01");
const FARMED_PER_DAY = ethers.parseEther("1");
const TOLERANCE = ethers.parseEther("0.001");
const ONE_DAY = 86_400;

async function deployRentable() {
  const deployment = await deployLunarLease();
  const { marketplace, alice, bob, carol } = deployment;

  for (const account of [alice, bob, carol]) {
    await marketplace.connect(account).popUpBalance(account.address, { value: TOP_UP });
  }

  for (const sectorId of [SECTOR_A, SECTOR_B]) {
    await marketplace.connect(alice).acquireSector(sectorId);
    await marketplace.connect(alice).setRentalPrice(sectorId, PRICE_PER_DAY);
    await marketplace.connect(alice).setRentEnabled(sectorId, true);
  }

  return deployment;
}

describe("MoonMarketplace — farming", () => {
  it("farms nothing for an account with no holdings", async () => {
    const { marketplace, bob } = await networkHelpers.loadFixture(deployRentable);

    await networkHelpers.time.increase(ONE_DAY);

    expect(await marketplace.farmedBalance(bob.address)).to.equal(0n);
    await expect(marketplace.connect(bob).claimFarmedBalance()).to.be.revertedWithCustomError(
      marketplace,
      "NothingToWithdraw",
    );
  });

  it("farms one rate per owned sector per day", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployRentable);

    await networkHelpers.time.increase(ONE_DAY);

    expect(await marketplace.farmedBalance(alice.address)).to.be.closeTo(
      2n * FARMED_PER_DAY,
      TOLERANCE,
    );
  });

  it("credits the farmed MUN and resets the checkpoint on claim", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployRentable);

    const before = await marketplace.getMUNBalance(alice.address);

    await networkHelpers.time.increase(ONE_DAY);
    await marketplace.connect(alice).claimFarmedBalance();

    expect(await marketplace.getMUNBalance(alice.address)).to.be.closeTo(
      before + 2n * FARMED_PER_DAY,
      TOLERANCE,
    );
    expect(await marketplace.farmCheckpoint(alice.address)).to.equal(
      BigInt(await networkHelpers.time.latest()),
    );
    expect(await marketplace.farmedBalance(alice.address)).to.equal(0n);
  });

  it("does not pay the same seconds twice across claims", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployRentable);

    await networkHelpers.time.increase(ONE_DAY);
    await marketplace.connect(alice).claimFarmedBalance();

    const afterFirst = await marketplace.getMUNBalance(alice.address);

    await networkHelpers.time.increase(ONE_DAY);
    await marketplace.connect(alice).claimFarmedBalance();

    expect(await marketplace.getMUNBalance(alice.address)).to.be.closeTo(
      afterFirst + 2n * FARMED_PER_DAY,
      TOLERANCE,
    );
  });

  it("farms a rental only for the days it was held", async () => {
    const { marketplace, bob } = await networkHelpers.loadFixture(deployRentable);

    await marketplace.connect(bob).rentSector(SECTOR_A, 2n);
    await networkHelpers.time.increase(5 * ONE_DAY);

    expect(await marketplace.farmedBalance(bob.address)).to.equal(2n * FARMED_PER_DAY);
  });

  it("emits the claim with the credited amount", async () => {
    const { marketplace, bob } = await networkHelpers.loadFixture(deployRentable);

    await marketplace.connect(bob).rentSector(SECTOR_A, 3n);
    await networkHelpers.time.increase(3 * ONE_DAY);

    await expect(marketplace.connect(bob).claimFarmedBalance())
      .to.emit(marketplace, "FarmedBalanceClaimed")
      .withArgs(bob.address, 3n * FARMED_PER_DAY);
  });

  it("stops farming a sector once it is sold", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployRentable);

    await networkHelpers.time.increase(ONE_DAY);
    await marketplace.connect(alice).claimFarmedBalance();

    await marketplace.connect(alice).listForSale(SECTOR_B, ethers.parseEther("0.2"));
    await marketplace.connect(bob).buyListedSector(SECTOR_B);

    await networkHelpers.time.increase(ONE_DAY);

    expect(await marketplace.farmedBalance(alice.address)).to.be.closeTo(
      FARMED_PER_DAY,
      TOLERANCE,
    );
    expect(await marketplace.farmedBalance(bob.address)).to.be.closeTo(
      FARMED_PER_DAY,
      TOLERANCE,
    );
  });
});
