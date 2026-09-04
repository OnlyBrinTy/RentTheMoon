# LunarLease

**This is my pet-project about blockchain-based ownership transfer. It's based on Polygon's testnet called Amoy.**

Decentralized virtual lunar real estate on Polygon. Acquire unclaimed sectors of
the Moon as ERC-721 tokens, rent them out with ERC-4907 temporary usage rights,
and trade them on a POL-denominated secondary market — all explored through an
interactive 3D Moon.

> **Legal notice.** Lunar sectors represent virtual ownership within the
> LunarLease system. They do **not** represent legally recognized ownership of
> physical lunar territory.

## Repository layout

```text
lunarlease/
├── apps/web/            Next.js + React Three Fiber frontend
├── packages/contracts/  Solidity, Hardhat 3, Hardhat Ignition
├── packages/shared/     Sector mathematics, constants, shared types
├── ponder/              Event indexer (added after the core dApp works)
└── docs/                Contract interface and admin-power documentation
```

## The sector model

The Moon is divided into a deterministic 5° × 5° latitude-longitude grid.

```text
36 latitude bands × 72 longitude bands = 2,592 sectors

sectorId = latitudeIndex * 72 + longitudeIndex
```

The same coordinates always resolve to the same `sectorId`. Geometry is computed
in `packages/shared`; the chain only ever stores the sector ID.

## Prerequisites

Node.js 20.18+ (developed on 24.11) and pnpm 10.

pnpm is installed workspace-locally at `.tooling/node_modules/.bin/pnpm` because
the sandbox blocks global installs. Either use that path directly or put it on
your `PATH`:

```bash
export PATH="$PWD/.tooling/node_modules/.bin:$PATH"
```

If you have pnpm globally, use it as normal and ignore `.tooling`.

## Getting started

```bash
pnpm install
pnpm build:shared
```

### Local chain

```bash
pnpm chain          # terminal 1: hardhat node
pnpm deploy:local   # terminal 2: deploy via Hardhat Ignition
pnpm dev            # terminal 3: frontend against localhost:8545
```

`pnpm deploy:local` writes `packages/contracts/deployments/<chainId>.json` and
syncs `apps/web/.env.local` with the registry and marketplace addresses. Run it
again after every chain restart — a running node with no deployment is the usual
cause of empty contract reads such as `getSector` returning `"0x"`.

### Tests

```bash
pnpm test               # everything
pnpm test:contracts     # Solidity behaviour and failure cases
```

## Configuration

The frontend never hardcodes addresses. It reads:

```text
NEXT_PUBLIC_CHAIN_ID
NEXT_PUBLIC_REGISTRY_ADDRESS
NEXT_PUBLIC_MARKETPLACE_ADDRESS
NEXT_PUBLIC_RPC_URL
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
```

Contract deployment reads `AMOY_RPC_URL`, `PRIVATE_KEY`, and
`POLYGONSCAN_API_KEY` from `packages/contracts/.env`.

## Economics

| Item | Value |
| --- | --- |
| Initial acquisition price | 0.1 POL, uniform for every unclaimed sector |
| Rental price | Set by the sector owner, per day |
| Platform fee | 3% of rental and secondary-sale volume |
| Payout model | Pull payments — balances accrue and are withdrawn |

A sector with an active rental cannot be sold. The lease must expire first; V1
deliberately avoids leases surviving a transfer.

## Documentation

- [`docs/CONTRACT_INTERFACE.md`](docs/CONTRACT_INTERFACE.md) — the frozen
  contract boundary shared by the contracts, frontend, and indexer.
- [`docs/CONTRACTS.md`](docs/CONTRACTS.md) — every privileged capability and the
  role that holds it.

## Networks

Local Hardhat first, then Polygon Amoy (chain ID 80002), and only after the
system is complete, Polygon PoS mainnet. Contracts are intentionally
**not upgradeable** in V1.
