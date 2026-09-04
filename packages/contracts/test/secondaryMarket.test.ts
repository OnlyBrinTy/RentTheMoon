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

const SALE_PRICE = 500_000_000_000_000_000n;

describe("MoonMarketplace — listing", () => {
  it("lets the owner list a sector", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE))
      .to.emit(marketplace, "SectorListed")
      .withArgs(SECTOR_A, SALE_PRICE);

    const view = await marketplace.getSector(SECTOR_A);
    expect(view.saleEnabled).to.equal(true);
    expect(view.salePrice).to.equal(SALE_PRICE);
  });

  it("rejects a listing from anyone but the owner", async () => {
    const { marketplace, bob, admin } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(marketplace.connect(bob).listForSale(SECTOR_A, SALE_PRICE))
      .to.be.revertedWithCustomError(marketplace, "NotSectorOwner")
      .withArgs(SECTOR_A, bob.address);

    await expect(
      marketplace.connect(admin).listForSale(SECTOR_A, SALE_PRICE),
    ).to.be.revertedWithCustomError(marketplace, "NotSectorOwner");
  });

  it("rejects a listing for an unminted sector", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(
      marketplace.connect(alice).listForSale(SECTOR_B, SALE_PRICE),
    ).to.be.revertedWithCustomError(marketplace, "SectorNotMinted");
  });

  it("lets the owner cancel a listing", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);

    await expect(marketplace.connect(alice).cancelListing(SECTOR_A))
      .to.emit(marketplace, "SectorListingCancelled")
      .withArgs(SECTOR_A);

    const view = await marketplace.getSector(SECTOR_A);
    expect(view.saleEnabled).to.equal(false);
    expect(view.salePrice).to.equal(0n);
  });

  it("rejects cancelling a sector that is not listed", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(marketplace.connect(alice).cancelListing(SECTOR_A))
      .to.be.revertedWithCustomError(marketplace, "NotListed")
      .withArgs(SECTOR_A);
  });

  it("rejects cancelling from anyone but the owner", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);

    await expect(
      marketplace.connect(bob).cancelListing(SECTOR_A),
    ).to.be.revertedWithCustomError(marketplace, "NotSectorOwner");
  });
});

describe("MoonMarketplace — secondary purchase", () => {
  it("transfers ownership and credits the seller in MUN net of the platform fee", async () => {
    const { marketplace, registry, admin, alice, bob } =
      await networkHelpers.loadFixture(deployWithOwnedSector);

    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);

    const treasuryBefore = await marketplace.getMUNBalance(admin.address);
    const sellerBefore = await marketplace.getMUNBalance(alice.address);
    const buyerBefore = await marketplace.getMUNBalance(bob.address);

    await expect(marketplace.connect(bob).buyListedSector(SECTOR_A))
      .to.emit(marketplace, "SectorSold")
      .withArgs(SECTOR_A, alice.address, bob.address, SALE_PRICE);

    expect(await registry.ownerOf(SECTOR_A)).to.equal(bob.address);
    expect((await marketplace.getMUNBalance(alice.address)) - sellerBefore).to.equal(
      beneficiaryShareOf(SALE_PRICE),
    );
    expect(buyerBefore - (await marketplace.getMUNBalance(bob.address))).to.equal(SALE_PRICE);
    expect((await marketplace.getMUNBalance(admin.address)) - treasuryBefore).to.equal(
      platformFeeOf(SALE_PRICE),
    );

    const view = await marketplace.getSector(SECTOR_A);
    expect(view.saleEnabled).to.equal(false);
    expect(view.salePrice).to.equal(0n);
  });

  it("settles entirely in MUN without moving any POL", async () => {
    const { marketplace, alice, bob, marketplaceAddress } =
      await networkHelpers.loadFixture(deployWithOwnedSector);

    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);

    const platformBefore = await marketplace.platformBalance();
    const heldBefore = await ethers.provider.getBalance(marketplaceAddress);
    const sellerWalletBefore = await ethers.provider.getBalance(alice.address);

    await marketplace.connect(bob).buyListedSector(SECTOR_A);

    expect(await marketplace.platformBalance()).to.equal(platformBefore);
    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(heldBefore);
    expect(await ethers.provider.getBalance(alice.address)).to.equal(sellerWalletBefore);
  });

  it("lets the seller spend the sale proceeds straight away", async () => {
    const { marketplace, registry, alice, bob, treasury } =
      await networkHelpers.loadFixture(deployWithOwnedSector);

    await marketplace
      .connect(alice)
      .sendMUN(treasury.address, await marketplace.getMUNBalance(alice.address));
    expect(await marketplace.getMUNBalance(alice.address)).to.equal(0n);

    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);
    await marketplace.connect(bob).buyListedSector(SECTOR_A);

    expect(await marketplace.getMUNBalance(alice.address)).to.equal(
      beneficiaryShareOf(SALE_PRICE),
    );

    await marketplace.connect(alice).acquireSector(SECTOR_B);

    expect(await registry.ownerOf(SECTOR_B)).to.equal(alice.address);
  });

  it("rejects buying a sector that is not listed", async () => {
    const { marketplace, bob } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(marketplace.connect(bob).buyListedSector(SECTOR_A))
      .to.be.revertedWithCustomError(marketplace, "NotListed")
      .withArgs(SECTOR_A);
  });

  it("rejects the owner buying their own listing", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);

    await expect(marketplace.connect(alice).buyListedSector(SECTOR_A))
      .to.be.revertedWithCustomError(marketplace, "CannotBuyOwnSector")
      .withArgs(SECTOR_A);
  });

  it("rejects a MUN balance below the sale price", async () => {
    const { marketplace, alice, treasury } =
      await networkHelpers.loadFixture(deployWithOwnedSector);

    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);

    const funded = await fundMUN(marketplace, treasury, SALE_PRICE - 10n);

    await expect(marketplace.connect(treasury).buyListedSector(SECTOR_A))
      .to.be.revertedWithCustomError(marketplace, "InsufficientPayment")
      .withArgs(SALE_PRICE, funded);
  });

  it("leaves the listing intact when the buyer cannot pay", async () => {
    const { marketplace, registry, alice, treasury } =
      await networkHelpers.loadFixture(deployWithOwnedSector);

    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);

    await expect(
      marketplace.connect(treasury).buyListedSector(SECTOR_A),
    ).to.be.revertedWithCustomError(marketplace, "InsufficientPayment");

    const view = await marketplace.getSector(SECTOR_A);
    expect(view.saleEnabled).to.equal(true);
    expect(view.salePrice).to.equal(SALE_PRICE);
    expect(await registry.ownerOf(SECTOR_A)).to.equal(alice.address);
  });

  it("debits the buyer exactly the sale price", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);

    const before = await marketplace.getMUNBalance(bob.address);
    await marketplace.connect(bob).buyListedSector(SECTOR_A);

    expect(await marketplace.getMUNBalance(bob.address)).to.equal(before - SALE_PRICE);
  });

  it("refuses a sale while usage rights are still held", async () => {
    const { marketplace, alice, bob, carol } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n);
    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);

    await expect(marketplace.connect(carol).buyListedSector(SECTOR_A))
      .to.be.revertedWithCustomError(marketplace, "SectorCurrentlyRented")
      .withArgs(SECTOR_A);
  });

  it("allows the sale once the rental has lapsed", async () => {
    const { marketplace, registry, alice, bob, carol } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(bob).rentSector(SECTOR_A, 1n);
    await marketplace.connect(alice).listForSale(SECTOR_A, SALE_PRICE);

    await time.increase(SECONDS_PER_DAY + 10n);

    await marketplace.connect(carol).buyListedSector(SECTOR_A);

    expect(await registry.ownerOf(SECTOR_A)).to.equal(carol.address);
    expect(await registry.userOf(SECTOR_A)).to.equal(ZERO_ADDRESS);
    expect(await registry.userExpires(SECTOR_A)).to.equal(0n);
  });
});

describe("MoonLandRegistry — direct transfers", () => {
  it("moves control of the marketplace configuration with the ERC-721 owner", async () => {
    const { marketplace, registry, alice, bob } =
      await networkHelpers.loadFixture(deployWithOwnedSector);

    await registry.connect(alice).transferFrom(alice.address, bob.address, SECTOR_A);
    expect(await registry.ownerOf(SECTOR_A)).to.equal(bob.address);

    await expect(marketplace.connect(bob).setRentalPrice(SECTOR_A, 777n))
      .to.emit(marketplace, "RentalPriceChanged")
      .withArgs(SECTOR_A, 777n);

    await expect(marketplace.connect(alice).setRentalPrice(SECTOR_A, 1n))
      .to.be.revertedWithCustomError(marketplace, "NotSectorOwner")
      .withArgs(SECTOR_A, alice.address);
  });

  it("clears the ERC-4907 user on a direct wallet-to-wallet transfer", async () => {
    const { marketplace, registry, alice, bob, carol } =
      await networkHelpers.loadFixture(deployWithRentableSector);

    await marketplace.connect(bob).rentSector(SECTOR_A, 30n);
    expect(await registry.userOf(SECTOR_A)).to.equal(bob.address);

    await expect(registry.connect(alice).transferFrom(alice.address, carol.address, SECTOR_A))
      .to.emit(registry, "UpdateUser")
      .withArgs(SECTOR_A, ZERO_ADDRESS, 0n);

    expect(await registry.userOf(SECTOR_A)).to.equal(ZERO_ADDRESS);
    expect(await registry.userExpires(SECTOR_A)).to.equal(0n);
  });
});
