import { expect } from "chai";
import { describe, it } from "mocha";

import {
  MUN_TO_ETH_RATE,
  ZERO_ADDRESS,
  deployLunarLease,
  ethers,
  fundMUN,
  networkHelpers,
} from "./helpers.js";

const DEPOSIT = 1_000_000_000_000_000_000n;

describe("MoonMarketplace — topping up MUN", () => {
  it("credits MUN at the advertised rate and keeps the POL", async () => {
    const { marketplace, alice, marketplaceAddress } =
      await networkHelpers.loadFixture(deployLunarLease);

    expect(await marketplace.MUN_TO_ETH_RATE()).to.equal(MUN_TO_ETH_RATE);

    await expect(marketplace.connect(alice).popUpBalance(alice.address, { value: DEPOSIT }))
      .to.emit(marketplace, "Deposited")
      .withArgs(alice.address, DEPOSIT * MUN_TO_ETH_RATE);

    expect(await marketplace.getMUNBalance(alice.address)).to.equal(DEPOSIT * MUN_TO_ETH_RATE);
    expect(await marketplace.balances(alice.address)).to.equal(DEPOSIT * MUN_TO_ETH_RATE);
    expect(await marketplace.platformBalance()).to.equal(DEPOSIT);
    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(DEPOSIT);
  });

  it("takes the POL out of the payer's wallet", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(
      marketplace.connect(alice).popUpBalance(alice.address, { value: DEPOSIT }),
    ).to.changeEtherBalance(ethers, alice, -DEPOSIT);
  });

  it("accumulates across top-ups", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    await marketplace.connect(alice).popUpBalance(alice.address, { value: DEPOSIT });
    await marketplace.connect(alice).popUpBalance(alice.address, { value: DEPOSIT * 2n });

    expect(await marketplace.getMUNBalance(alice.address)).to.equal(
      DEPOSIT * 3n * MUN_TO_ETH_RATE,
    );
    expect(await marketplace.platformBalance()).to.equal(DEPOSIT * 3n);
  });

  it("lets one account top another one up", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployLunarLease);

    await marketplace.connect(alice).popUpBalance(bob.address, { value: DEPOSIT });

    expect(await marketplace.getMUNBalance(bob.address)).to.equal(DEPOSIT * MUN_TO_ETH_RATE);
    expect(await marketplace.getMUNBalance(alice.address)).to.equal(0n);
  });

  it("rejects a top-up carrying no value", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(marketplace.connect(alice).popUpBalance(alice.address, { value: 0n }))
      .to.be.revertedWithCustomError(marketplace, "InsufficientPayment")
      .withArgs(1n, 0n);
  });

  it("rejects a top-up to the zero address", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(
      marketplace.connect(alice).popUpBalance(ZERO_ADDRESS, { value: DEPOSIT }),
    ).to.be.revertedWithCustomError(marketplace, "ZeroAddress");
  });
});

describe("MoonMarketplace — sending MUN", () => {
  it("moves MUN between accounts and emits the transfer", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployLunarLease);

    const funded = await fundMUN(marketplace, alice, DEPOSIT * MUN_TO_ETH_RATE);
    const amount = funded / 4n;

    await expect(marketplace.connect(alice).sendMUN(bob.address, amount))
      .to.emit(marketplace, "Sent")
      .withArgs(alice.address, bob.address, amount);

    expect(await marketplace.getMUNBalance(alice.address)).to.equal(funded - amount);
    expect(await marketplace.getMUNBalance(bob.address)).to.equal(amount);
  });

  it("leaves the POL holdings and the platform balance alone", async () => {
    const { marketplace, alice, bob, marketplaceAddress } =
      await networkHelpers.loadFixture(deployLunarLease);

    const funded = await fundMUN(marketplace, alice, DEPOSIT * MUN_TO_ETH_RATE);
    const platformBefore = await marketplace.platformBalance();

    await marketplace.connect(alice).sendMUN(bob.address, funded);

    expect(await marketplace.platformBalance()).to.equal(platformBefore);
    expect(await ethers.provider.getBalance(marketplaceAddress)).to.equal(platformBefore);
  });

  it("lets the recipient spend what it received", async () => {
    const { marketplace, registry, alice, bob } =
      await networkHelpers.loadFixture(deployLunarLease);

    const funded = await fundMUN(marketplace, alice, DEPOSIT * MUN_TO_ETH_RATE);
    await marketplace.connect(alice).sendMUN(bob.address, funded);

    await marketplace.connect(bob).acquireSector(1n);

    expect(await registry.ownerOf(1n)).to.equal(bob.address);
  });

  it("rejects sending more than the balance", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployLunarLease);

    const funded = await fundMUN(marketplace, alice, DEPOSIT * MUN_TO_ETH_RATE);

    await expect(marketplace.connect(alice).sendMUN(bob.address, funded + 1n))
      .to.be.revertedWithCustomError(marketplace, "InsufficientPayment")
      .withArgs(funded + 1n, funded);

    expect(await marketplace.getMUNBalance(alice.address)).to.equal(funded);
    expect(await marketplace.getMUNBalance(bob.address)).to.equal(0n);
  });

  it("rejects sending from an account that never topped up", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployLunarLease);

    await expect(marketplace.connect(alice).sendMUN(bob.address, 1n))
      .to.be.revertedWithCustomError(marketplace, "InsufficientPayment")
      .withArgs(1n, 0n);
  });

  it("rejects a zero amount", async () => {
    const { marketplace, alice, bob } = await networkHelpers.loadFixture(deployLunarLease);

    await fundMUN(marketplace, alice, DEPOSIT * MUN_TO_ETH_RATE);

    await expect(marketplace.connect(alice).sendMUN(bob.address, 0n))
      .to.be.revertedWithCustomError(marketplace, "InsufficientPayment")
      .withArgs(1n, 0n);
  });

  it("rejects sending to the zero address", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    await fundMUN(marketplace, alice, DEPOSIT * MUN_TO_ETH_RATE);

    await expect(
      marketplace.connect(alice).sendMUN(ZERO_ADDRESS, 1n),
    ).to.be.revertedWithCustomError(marketplace, "ZeroAddress");
  });
});

describe("MoonMarketplace — reading MUN balances", () => {
  it("reports zero for an account that has never held MUN", async () => {
    const { marketplace, carol, marketplaceAddress } =
      await networkHelpers.loadFixture(deployLunarLease);

    expect(await marketplace.getMUNBalance(carol.address)).to.equal(0n);
    expect(await marketplace.getMUNBalance(ZERO_ADDRESS)).to.equal(0n);
    expect(await marketplace.getMUNBalance(marketplaceAddress)).to.equal(0n);
  });

  it("agrees with the public balances mapping", async () => {
    const { marketplace, alice } = await networkHelpers.loadFixture(deployLunarLease);

    const funded = await fundMUN(marketplace, alice, DEPOSIT);

    expect(await marketplace.getMUNBalance(alice.address)).to.equal(funded);
    expect(await marketplace.balances(alice.address)).to.equal(funded);
  });
});
