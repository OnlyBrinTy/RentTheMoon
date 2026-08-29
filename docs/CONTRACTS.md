# LunarLease — Contract System (V1)

Two non-upgradeable contracts on Polygon, implementing
[`docs/CONTRACT_INTERFACE.md`](./CONTRACT_INTERFACE.md).

| Contract | Responsibility |
| --- | --- |
| `MoonLandRegistry` | ERC-721 ownership of the 2592 lunar sectors, ERC-4907 usage rights, on-chain metadata |
| `MoonMarketplace` | Every wei of POL, primary sale pricing, rentals, secondary market, fee accounting |

The registry never holds money. The marketplace never holds tokens. The only
trust edge between them is `MARKETPLACE_ROLE`.

## Roles and privileged capabilities

### `MoonLandRegistry`

| Role | Holder at deploy | Capabilities |
| --- | --- | --- |
| `DEFAULT_ADMIN_ROLE` | deployer account (`admin` constructor argument) | grant and revoke `MARKETPLACE_ROLE` and `DEFAULT_ADMIN_ROLE` |
| `MARKETPLACE_ROLE` | the deployed `MoonMarketplace` | `mintSector`, `setUser`, `marketplaceTransfer` |

`MARKETPLACE_ROLE` is the only way to mint a sector, to assign or clear ERC-4907
usage rights, and to move a sector as part of a settled sale. Nothing else in
the registry is privileged: `transferFrom`, `safeTransferFrom`, `approve` and
`setApprovalForAll` behave exactly as in a stock ERC-721 and are available to
sector owners only.

### `MoonMarketplace`

| Role | Holder at deploy | Capabilities |
| --- | --- | --- |
| `DEFAULT_ADMIN_ROLE` | deployer account (`admin` constructor argument) | `setInitialSectorPrice`, `setPlatformFeeBps`, grant and revoke roles |
| `TREASURY_ROLE` | deployer account (`admin` constructor argument) | `withdrawPlatformFunds` |

`TREASURY_ROLE` is separated from `DEFAULT_ADMIN_ROLE` so fee collection can be
delegated to a payments account or a multisig without also handing over pricing
control. Because `DEFAULT_ADMIN_ROLE` administers every role, an admin can grant
itself `TREASURY_ROLE`; the separation is an operational boundary, not a
security boundary against a compromised admin key. Run the admin role from a
multisig in production.

## What the admin can do

- reprice the primary market (`setInitialSectorPrice`) — affects future
  acquisitions only
- change the platform fee (`setPlatformFeeBps`) — affects future rentals and
  sales only, and is hard-capped at `MAX_PLATFORM_FEE_BPS = 1000` (10%) by a
  check the admin cannot bypass
- grant or revoke `MARKETPLACE_ROLE` on the registry, for example to retire this
  marketplace and point the registry at a successor
- grant or revoke `TREASURY_ROLE`
- withdraw accrued platform fees to any non-zero address, up to
  `platformBalance`

## What the admin cannot do

- **touch user funds.** `withdrawPlatformFunds` can only spend `platformBalance`.
  Rental income, sale proceeds and overpayment refunds live in
  `claimableBalance[account]`, which is only ever reduced by the account itself
  through `withdrawRentalIncome`. There is no admin path that reads or reduces
  another account's claimable balance, and an over-large treasury withdrawal
  reverts with `InsufficientPlatformBalance`.
- **mint, move, seize or burn a sector.** Minting and transfers are behind
  `MARKETPLACE_ROLE`, which is held by the marketplace contract, not by a human.
  The admin could grant itself `MARKETPLACE_ROLE` on the registry — treat that
  as the main residual trust assumption of V1 and hold the role in a multisig.
- **retroactively change a price or a fee.** Every fee is computed and credited
  inside the transaction that charges it; later config changes do not reprice
  balances that already accrued.
- **cancel, extend or reassign a rental.** Only `rentSector` writes ERC-4907
  state, and it is reachable by anyone who pays.
- **set a fee above 10%,** pause the system, freeze an account, or upgrade the
  code.

## Fee model

- `platformFeeBps` is `300` at deploy: **3%**, denominator `10000`.
- Primary acquisition: the entire `initialSectorPrice` (`0.1 POL`) accrues to
  `platformBalance`. There is no seller.
- Rental: `totalPrice = pricePerDay * numberOfDays`;
  `platformFee = totalPrice * platformFeeBps / 10000`; the remainder accrues to
  the sector owner. Integer division truncates, so the platform's share rounds
  down and the owner absorbs the remainder wei.
- Secondary sale: the same split between the platform and the seller.
- Overpayment on acquire, rent or buy is never part of the fee base; it accrues
  in full to the payer's `claimableBalance`.
- `SECONDS_PER_DAY = 86400`, rentals are `[1, 365]` days.

## Pull payments

Nothing is pushed to a seller, owner or payer during `acquireSector`,
`rentSector` or `buyListedSector`. Those functions only move numbers in
`claimableBalance` and `platformBalance`; POL leaves the contract exclusively
through `withdrawRentalIncome` and `withdrawPlatformFunds`.

Why:

- **A hostile recipient cannot block someone else's transaction.** If proceeds
  were pushed, a seller contract with a reverting `receive` would make every
  purchase of its listing fail, and a renter could be griefed by an owner whose
  wallet rejects transfers.
- **Gas cost is bounded and predictable.** A buyer never pays for arbitrary code
  in a seller's fallback.
- **Refunds are safe.** Inline refunds of overpayment are the classic place
  where a callback re-enters a half-updated contract; crediting instead removes
  the call entirely from the hot path.

Both withdrawal functions follow checks-effects-interactions strictly: the
balance is read, zeroed (or decremented), the event is emitted, and only then is
`Address.sendValue` called. Both are `nonReentrant`, as is every function that
moves POL. `ReentrantAttacker` in `packages/contracts/contracts/test/` proves
this end to end: it re-enters `withdrawRentalIncome` from `receive`, the
re-entrant call reverts with `ReentrancyGuardReentrantCall`, and the attacker
receives its balance exactly once.

## Rental and sale interaction

- `userOf` returns `address(0)` as soon as `userExpires <= block.timestamp`. No
  clearing transaction is ever required, and none is charged for.
- Any ERC-721 transfer — primary mint, marketplace settlement, or a direct
  wallet-to-wallet `transferFrom` — clears the ERC-4907 user in `_update` and
  emits `UpdateUser(tokenId, address(0), 0)`.
- `buyListedSector` reverts with `SectorCurrentlyRented` while
  `registry.userExpires(sectorId) >= block.timestamp`, so a sale can never
  destroy an active rental. `rentSector` uses the same comparison for
  `AlreadyRented`, one second more conservative than `userOf`, so the two
  guards agree.
- Marketplace rental configuration (`pricePerDay`, `rentEnabled`) is keyed by
  sector, not by owner, and survives a change of owner. A buyer inherits the
  previous owner's rental settings and should review them; this is uniform for
  marketplace sales and direct transfers, which the marketplace cannot observe.

## Metadata

`tokenURI` returns a base64 `data:application/json` URI built entirely on-chain
from the sector id: `latitudeIndex = sectorId / 72`,
`longitudeIndex = sectorId % 72`, `latMin = -90 + latitudeIndex * 5`,
`lonMin = -180 + longitudeIndex * 5`. It deliberately contains no ownership,
rental or price data, so metadata can never go stale and needs no off-chain
host.

## Non-upgradeability

**The V1 contracts are not upgradeable.** There is no proxy, no
`delegatecall`, no implementation slot and no initializer. The deployed
bytecode of `MoonLandRegistry` and `MoonMarketplace` is final.

The migration path is deliberate rather than technical: deploy a new
marketplace, grant it `MARKETPLACE_ROLE` on the existing registry, and revoke
the role from the old one. Sector ownership and ERC-4907 state carry over
untouched because they live in the registry. Balances already accrued in the old
marketplace stay withdrawable there.

Replacing the registry itself is not supported in V1; it would mean a new token
contract.
