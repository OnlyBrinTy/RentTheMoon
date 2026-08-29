# @lunarlease/contracts

Hardhat 3 workspace for the LunarLease V1 contract system on Polygon.

- `contracts/MoonLandRegistry.sol` — ERC-721 + ERC-721 Enumerable + ERC-4907 + AccessControl
- `contracts/MoonMarketplace.sol` — pricing, rentals, secondary market, pull payments
- `contracts/interfaces/` — `IERC4907`, `IMoonLandRegistry`
- `contracts/test/ReentrantAttacker.sol` — test-only hostile receiver

The frozen boundary is [`docs/CONTRACT_INTERFACE.md`](../../docs/CONTRACT_INTERFACE.md).
Roles, fee model and the non-upgradeability statement are in
[`docs/CONTRACTS.md`](../../docs/CONTRACTS.md).

`pnpm` is workspace-local in this repo; invoke it as
`./.tooling/node_modules/.bin/pnpm` from the repository root, or put that
directory on `PATH`.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm build` | `hardhat compile` |
| `pnpm test` | `hardhat test` (Mocha + ethers) |
| `pnpm typecheck` | compile, then `tsc --noEmit` |
| `pnpm chain` | local JSON-RPC node on `127.0.0.1:8545`, chain id `31337` |
| `pnpm deploy:local` | Ignition deploy to `localhost`, then generate addresses and ABIs |
| `pnpm deploy:amoy` | the same against Polygon Amoy |

## Local deployment

```bash
pnpm --filter @lunarlease/contracts chain          # terminal 1
pnpm --filter @lunarlease/contracts deploy:local   # terminal 2
```

This writes `deployments/31337.json` and regenerates `abi/registry.ts`,
`abi/marketplace.ts` and `abi/index.ts`.

## Environment

Copy `.env.example` to `.env`. `AMOY_RPC_URL`, `POLYGON_RPC_URL`, `PRIVATE_KEY`
and `POLYGONSCAN_API_KEY` are read from the environment; no secret is ever
committed. `PRIVATE_KEY` is only needed for the `amoy` and `polygon` networks.
