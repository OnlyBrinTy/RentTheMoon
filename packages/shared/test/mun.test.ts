import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FARMED_MUN_PER_DAY,
  farmingRateMunPerDay,
  heldSecondsSince,
  isOwnershipPeriodOpenEnded,
  MUN_TO_ETH_RATE,
  munFromNativeWei,
  nativeWeiFromMun,
  projectedFarmedMun,
  SECONDS_PER_DAY,
  type OwnershipPeriod,
} from "../dist/index.js";

test("one native token converts to ten MUN", () => {
  assert.equal(MUN_TO_ETH_RATE, 10n);
  assert.equal(munFromNativeWei(10n ** 18n), 10n * 10n ** 18n);
  assert.equal(nativeWeiFromMun(10n * 10n ** 18n), 10n ** 18n);
});

test("MUN conversion round-trips on rate multiples", () => {
  for (const nativeWei of [0n, 1n, 250_000_000_000_000_000n, 3n * 10n ** 18n]) {
    assert.equal(nativeWeiFromMun(munFromNativeWei(nativeWei)), nativeWei);
  }
});

test("an open-ended period is one with a zero expiry", () => {
  assert.equal(isOwnershipPeriodOpenEnded({ start: 100n, expiry: 0n }), true);
  assert.equal(isOwnershipPeriodOpenEnded({ start: 100n, expiry: 200n }), false);
});

test("held seconds are clamped to the window since the checkpoint", () => {
  const periods: OwnershipPeriod[] = [
    { start: 0n, expiry: 0n },
    { start: 500n, expiry: 700n },
    { start: 900n, expiry: 0n },
  ];

  assert.equal(heldSecondsSince(periods, 600n, 1000n), 400n + 100n + 100n);
  assert.equal(heldSecondsSince(periods, 1000n, 1000n), 0n);
  assert.equal(heldSecondsSince([], 0n, 1000n), 0n);
});

test("an elapsed rental stops accruing at its expiry", () => {
  const periods: OwnershipPeriod[] = [{ start: 0n, expiry: 100n }];
  assert.equal(heldSecondsSince(periods, 0n, 5_000n), 100n);
});

test("farming pays one MUN per day per held sector", () => {
  const periods: OwnershipPeriod[] = [{ start: 0n, expiry: 0n }];
  assert.equal(projectedFarmedMun(periods, 0n, SECONDS_PER_DAY), FARMED_MUN_PER_DAY);
  assert.equal(projectedFarmedMun(periods, 0n, SECONDS_PER_DAY / 2n), FARMED_MUN_PER_DAY / 2n);
  assert.equal(projectedFarmedMun(periods, 0n, 0n), 0n);
});

test("a sector held twice over accrues twice", () => {
  const periods: OwnershipPeriod[] = [
    { start: 0n, expiry: 0n },
    { start: 0n, expiry: 0n },
  ];
  assert.equal(projectedFarmedMun(periods, 0n, SECONDS_PER_DAY), 2n * FARMED_MUN_PER_DAY);
});

test("the farming rate counts only periods live at the given instant", () => {
  const periods: OwnershipPeriod[] = [
    { start: 0n, expiry: 0n },
    { start: 0n, expiry: 100n },
    { start: 5_000n, expiry: 0n },
  ];

  assert.equal(farmingRateMunPerDay(periods, 50n), 2n * FARMED_MUN_PER_DAY);
  assert.equal(farmingRateMunPerDay(periods, 200n), FARMED_MUN_PER_DAY);
  assert.equal(farmingRateMunPerDay(periods, 6_000n), 2n * FARMED_MUN_PER_DAY);
});
