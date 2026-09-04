# LunarLease — Frozen Contract Interface (V1)

This document is the single source of truth for the boundary between
`packages/contracts` and `apps/web` / `ponder`. Both sides implement against it
so they can be developed in parallel. Do not change a signature here without
updating this file first.

## Constants


| Name                                       | Value                                           |
| ------------------------------------------ | ----------------------------------------------- |
| `LATITUDE_STEP_DEG` / `LONGITUDE_STEP_DEG` | 5                                               |
| `TOTAL_SECTORS`                            | 2592 (36 latitude bands × 72 longitude bands)   |
| valid `sectorId`                           | `0 <= sectorId < 2592`                          |
| `sectorId` formula                         | `latitudeIndex * 72 + longitudeIndex`           |
| `INITIAL_SECTOR_PRICE`                     | `0.1 ,,,,,,,,,,,,,,` = `100000000000000000` wei |
| `PLATFORM_FEE_BPS`                         | `300` (3%), denominator `10000`                 |
| `MIN_RENTAL_DAYS` / `MAX_RENTAL_DAYS`      | `1` / `365`                                     |
| `SECONDS_PER_DAY`                          | `86400`                                         |


Mirrored in TypeScript at `packages/shared/src/constants/index.ts`.

## Contracts

Two contracts. `MoonMarketplace` holds all money and pricing;
`MoonLandRegistry` holds ownership and ERC-4907 usage rights.

### MoonLandRegistry (ERC-721 + ERC-4907 + AccessControl)

Roles: `DEFAULT_ADMIN_ROLE`, `MARKETPLACE_ROLE`.

```solidity
function TOTAL_SECTORS() external view returns (uint256);
function exists(uint256 sectorId) external view returns (bool);
function isValidSector(uint256 sectorId) external pure returns (bool);

// Restricted to MARKETPLACE_ROLE. Mints sectorId to `to`.
function mintSector(uint256 sectorId, address to) external;

// Restricted to MARKETPLACE_ROLE. ERC-4907 user assignment.
function setUser(uint256 sectorId, address user, uint64 expires) external;

// Restricted to MARKETPLACE_ROLE. Used to settle a secondary sale.
function marketplaceTransfer(uint256 sectorId, address from, address to) external;

// ERC-4907 reads
function userOf(uint256 sectorId) external view returns (address);
function userExpires(uint256 sectorId) external view returns (uint256);

// ERC-721 standard surface: ownerOf, balanceOf, transferFrom,
// safeTransferFrom, approve, setApprovalForAll, tokenURI, supportsInterface

event UpdateUser(uint256 indexed tokenId, address indexed user, uint64 expires); // ERC-4907
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId); // ERC-721
```

`userOf` MUST return `address(0)` once `userExpires <= block.timestamp`, with no
transaction required to clear it.

Any ERC-721 transfer (primary, secondary, or direct wallet-to-wallet) MUST clear
the ERC-4907 user. Combined with the "no sale during active rental" rule below,
this keeps rental state unambiguous.

### MoonMarketplace (AccessControl + ReentrancyGuard)

Roles: `DEFAULT_ADMIN_ROLE`, `TREASURY_ROLE`.

```solidity
function registry() external view returns (address);
function initialSectorPrice() external view returns (uint256);
function platformFeeBps() external view returns (uint16);

// --- Primary acquisition (Phase 4) ---
function acquireSector(uint256 sectorId) external payable;

// --- Rental (Phases 7-9) ---
function setRentalPrice(uint256 sectorId, uint256 pricePerDay) external;
function setRentEnabled(uint256 sectorId, bool enabled) external;
function rentSector(uint256 sectorId, uint64 numberOfDays) external payable;

// --- Secondary market (Phase 10) ---
function listForSale(uint256 sectorId, uint256 price) external;
function cancelListing(uint256 sectorId) external;
function buyListedSector(uint256 sectorId) external payable;

// --- Pull payments (Phase 12) ---
function claimableBalance(address account) external view returns (uint256);
function platformBalance() external view returns (uint256);
function withdrawRentalIncome() external;                      // seller/owner pull
function withdrawPlatformFunds(address to, uint256 amount) external; // TREASURY_ROLE

// --- Admin ---
function setInitialSectorPrice(uint256 newPrice) external;  // DEFAULT_ADMIN_ROLE
function setPlatformFeeBps(uint16 newFeeBps) external;      // DEFAULT_ADMIN_ROLE, max 1000

// --- Aggregated read for the frontend (one call per sector) ---
struct SectorView {
    uint256 sectorId;
    bool minted;
    address owner;
    address user;
    uint64 userExpires;
    bool rentEnabled;
    uint256 pricePerDay;
    bool saleEnabled;
    uint256 salePrice;
}

function getSector(uint256 sectorId) external view returns (SectorView memory);
function getSectors(uint256[] calldata sectorIds) external view returns (SectorView[] memory);
```



### Events (indexed by Ponder in Phase 13)

```solidity
event SectorAcquired(uint256 indexed sectorId, address indexed owner, uint256 price);
event RentalPriceChanged(uint256 indexed sectorId, uint256 pricePerDay);
event RentAvailabilityChanged(uint256 indexed sectorId, bool enabled);
event SectorRented(uint256 indexed sectorId, address indexed renter, uint64 expiresAt, uint256 totalPrice);
event SectorListed(uint256 indexed sectorId, uint256 price);
event SectorListingCancelled(uint256 indexed sectorId);
event SectorSold(uint256 indexed sectorId, address indexed seller, address indexed buyer, uint256 price);
event RentalIncomeWithdrawn(address indexed account, uint256 amount);
event PlatformFundsWithdrawn(address indexed to, uint256 amount);
```



## Behavioural rules

Primary acquisition (`acquireSector`):

- reverts `InvalidSector` when `sectorId >= 2592`
- reverts `SectorAlreadyClaimed` when already minted
- reverts `InsufficientPayment` when `msg.value < initialSectorPrice`
- overpayment is credited to `claimableBalance[msg.sender]` (never auto-refunded via a call)
- proceeds go to `platformBalance`; POL stays in the contract until withdrawn

Rental (`rentSector`):

- reverts `SectorNotMinted`, `RentNotEnabled`, `AlreadyRented`, `InvalidDuration`
(`numberOfDays` outside `[1, 365]`), `InsufficientPayment`
- owner cannot rent their own sector (`CannotRentOwnSector`)
- `totalPrice = pricePerDay * numberOfDays`
- `expiresAt = uint64(block.timestamp) + numberOfDays * 86400`
- `platformFee = totalPrice * 300 / 10000`, remainder credited to the owner
- overpayment credited back to the renter's `claimableBalance`

Secondary sale (`buyListedSector`):

- reverts `NotListed`, `InsufficientPayment`, `CannotBuyOwnSector`
- reverts `SectorCurrentlyRented` when `userExpires(sectorId) >= block.timestamp`
- same 3% fee split, listing cleared, `SectorSold` emitted

Owner-only (`setRentalPrice`, `setRentEnabled`, `listForSale`, `cancelListing`):

- revert `NotSectorOwner` for anyone other than `registry.ownerOf(sectorId)`

Security: checks-effects-interactions everywhere, `nonReentrant` on every
function that sends POL, no `tx.origin`, not upgradeable in V1.

## Address / ABI plumbing

Deployment writes `packages/contracts/deployments/<chainId>.json`:

```json
{ "chainId": 31337, "registry": "0x...", "marketplace": "0x..." }
```

The frontend reads addresses from env, never hardcoded inline:

```
NEXT_PUBLIC_CHAIN_ID
NEXT_PUBLIC_REGISTRY_ADDRESS
NEXT_PUBLIC_MARKETPLACE_ADDRESS
NEXT_PUBLIC_RPC_URL              # Alchemy Polygon endpoint
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
```

ABIs live in `apps/web/lib/abi/` as `as const` TypeScript arrays so viem/wagmi
infer types. They must stay byte-compatible with the signatures above.

## Legal notice (required in the UI)

> Lunar sectors represent virtual ownership within the LunarLease system. They do
> not represent legally recognized ownership of physical lunar territory.

