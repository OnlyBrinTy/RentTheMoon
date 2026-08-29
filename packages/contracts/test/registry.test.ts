import { expect } from "chai";
import { describe, it } from "mocha";

import {
  ERC165_INTERFACE_ID,
  ERC4907_INTERFACE_ID,
  ERC721_ENUMERABLE_INTERFACE_ID,
  ERC721_INTERFACE_ID,
  ERC721_METADATA_INTERFACE_ID,
  INITIAL_SECTOR_PRICE,
  SECTOR_A,
  TOTAL_SECTORS,
  ZERO_ADDRESS,
  deployLunarLease,
  deployWithOwnedSector,
  networkHelpers,
} from "./helpers.js";

interface DecodedMetadata {
  name: string;
  description: string;
  attributes: { trait_type: string; value: string | number }[];
}

function decodeTokenUri(uri: string): DecodedMetadata {
  const prefix = "data:application/json;base64,";
  expect(uri.startsWith(prefix)).to.equal(true);

  const payload = Buffer.from(uri.slice(prefix.length), "base64").toString("utf8");
  return JSON.parse(payload) as DecodedMetadata;
}

function attributeValue(metadata: DecodedMetadata, traitType: string): string | number {
  const attribute = metadata.attributes.find((entry) => entry.trait_type === traitType);
  if (attribute === undefined) throw new Error(`Missing attribute ${traitType}`);
  return attribute.value;
}

describe("MoonLandRegistry", () => {
  it("exposes the frozen sector constants", async () => {
    const { registry } = await networkHelpers.loadFixture(deployLunarLease);

    expect(await registry.TOTAL_SECTORS()).to.equal(TOTAL_SECTORS);
    expect(await registry.isValidSector(0n)).to.equal(true);
    expect(await registry.isValidSector(TOTAL_SECTORS - 1n)).to.equal(true);
    expect(await registry.isValidSector(TOTAL_SECTORS)).to.equal(false);
    expect(await registry.name()).to.equal("LunarLease Moon Sector");
    expect(await registry.symbol()).to.equal("MOON");
  });

  it("advertises ERC-165, ERC-721, ERC-721 Enumerable and ERC-4907", async () => {
    const { registry } = await networkHelpers.loadFixture(deployLunarLease);

    expect(await registry.supportsInterface(ERC165_INTERFACE_ID)).to.equal(true);
    expect(await registry.supportsInterface(ERC721_INTERFACE_ID)).to.equal(true);
    expect(await registry.supportsInterface(ERC721_METADATA_INTERFACE_ID)).to.equal(true);
    expect(await registry.supportsInterface(ERC721_ENUMERABLE_INTERFACE_ID)).to.equal(true);
    expect(await registry.supportsInterface(ERC4907_INTERFACE_ID)).to.equal(true);
    expect(await registry.supportsInterface("0xdeadbeef")).to.equal(false);
  });

  it("derives immutable metadata from the sector id", async () => {
    const { registry } = await networkHelpers.loadFixture(deployWithOwnedSector);

    const metadata = decodeTokenUri(await registry.tokenURI(SECTOR_A));

    expect(metadata.name).to.equal("Lunar Sector #100");
    expect(metadata.description).to.contain("does not confer legally recognized ownership");
    expect(attributeValue(metadata, "Latitude")).to.equal("85°S – 80°S");
    expect(attributeValue(metadata, "Longitude")).to.equal("40°W – 35°W");
    expect(attributeValue(metadata, "Latitude Index")).to.equal(1);
    expect(attributeValue(metadata, "Longitude Index")).to.equal(28);
  });

  it("renders the zero meridian and equator without a hemisphere suffix", async () => {
    const { marketplace, registry, alice } =
      await networkHelpers.loadFixture(deployLunarLease);

    const sectorId = 1_332n;
    await marketplace.connect(alice).acquireSector(sectorId, { value: INITIAL_SECTOR_PRICE });

    const metadata = decodeTokenUri(await registry.tokenURI(sectorId));

    expect(attributeValue(metadata, "Latitude")).to.equal("0° – 5°N");
    expect(attributeValue(metadata, "Longitude")).to.equal("0° – 5°E");
  });

  it("keeps mutable ownership and rental state out of the metadata", async () => {
    const { registry } = await networkHelpers.loadFixture(deployWithOwnedSector);

    const metadata = decodeTokenUri(await registry.tokenURI(SECTOR_A));
    const traits = metadata.attributes.map((entry) => entry.trait_type);

    expect(traits).to.deep.equal([
      "Latitude",
      "Longitude",
      "Latitude Index",
      "Longitude Index",
    ]);
  });

  it("refuses metadata for an unminted sector", async () => {
    const { registry } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(registry.tokenURI(SECTOR_A)).to.be.revertedWithCustomError(
      registry,
      "ERC721NonexistentToken",
    );
  });

  it("rejects mintSector from an account without MARKETPLACE_ROLE", async () => {
    const { registry, alice, admin } = await networkHelpers.loadFixture(deployLunarLease);

    const marketplaceRole = await registry.MARKETPLACE_ROLE();

    await expect(registry.connect(alice).mintSector(SECTOR_A, alice.address))
      .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount")
      .withArgs(alice.address, marketplaceRole);

    await expect(
      registry.connect(admin).mintSector(SECTOR_A, admin.address),
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
  });

  it("rejects setUser from an account without MARKETPLACE_ROLE", async () => {
    const { registry, alice, bob } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(
      registry.connect(alice).setUser(SECTOR_A, bob.address, 2_000_000_000n),
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
  });

  it("rejects marketplaceTransfer from an account without MARKETPLACE_ROLE", async () => {
    const { registry, alice, bob } = await networkHelpers.loadFixture(deployWithOwnedSector);

    await expect(
      registry.connect(alice).marketplaceTransfer(SECTOR_A, alice.address, bob.address),
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");

    expect(await registry.ownerOf(SECTOR_A)).to.equal(alice.address);
  });

  it("rejects an invalid sector id even from the marketplace", async () => {
    const { registry, admin, alice } = await networkHelpers.loadFixture(deployLunarLease);

    await registry.connect(admin).grantRole(await registry.MARKETPLACE_ROLE(), admin.address);

    await expect(registry.connect(admin).mintSector(TOTAL_SECTORS, alice.address))
      .to.be.revertedWithCustomError(registry, "InvalidSector")
      .withArgs(TOTAL_SECTORS);
  });

  it("reports no user for a sector that was never rented", async () => {
    const { registry } = await networkHelpers.loadFixture(deployWithOwnedSector);

    expect(await registry.userOf(SECTOR_A)).to.equal(ZERO_ADDRESS);
    expect(await registry.userExpires(SECTOR_A)).to.equal(0n);
  });
});
