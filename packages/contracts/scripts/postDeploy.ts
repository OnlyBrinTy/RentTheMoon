import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const IGNITION_DEPLOYMENTS = join(packageRoot, "ignition", "deployments");
const ARTIFACTS = join(packageRoot, "artifacts", "contracts");
const DEPLOYMENTS_OUT = join(packageRoot, "deployments");
const ABI_OUT = join(packageRoot, "abi");
const WEB_ENV = join(packageRoot, "..", "..", "apps", "web", ".env.local");
const LOCAL_RPC_URL = "http://127.0.0.1:8545";

const REGISTRY_FUTURE = "LunarLease#MoonLandRegistry";
const MARKETPLACE_FUTURE = "LunarLease#MoonMarketplace";

type DeployedAddresses = Record<string, string>;

function resolveChainId(): string {
  const explicit = process.argv[2] ?? process.env.CHAIN_ID;
  if (explicit) return explicit;

  if (!existsSync(IGNITION_DEPLOYMENTS)) {
    throw new Error(`No Ignition deployments found at ${IGNITION_DEPLOYMENTS}. Run the deploy first.`);
  }

  const chainDirs = readdirSync(IGNITION_DEPLOYMENTS).filter((entry) => entry.startsWith("chain-"));
  if (chainDirs.length !== 1) {
    throw new Error(
      `Expected exactly one Ignition chain directory, found ${chainDirs.length}. Pass the chain id explicitly.`,
    );
  }

  return chainDirs[0]!.replace("chain-", "");
}

function readDeployedAddresses(chainId: string): DeployedAddresses {
  const file = join(IGNITION_DEPLOYMENTS, `chain-${chainId}`, "deployed_addresses.json");
  if (!existsSync(file)) {
    throw new Error(`Missing ${file}. Run \`hardhat ignition deploy\` before this script.`);
  }

  return JSON.parse(readFileSync(file, "utf8")) as DeployedAddresses;
}

function requireAddress(addresses: DeployedAddresses, futureId: string): string {
  const address = addresses[futureId];
  if (!address) {
    throw new Error(`Future ${futureId} is missing from deployed_addresses.json.`);
  }

  return address;
}

function readAbi(contractName: string): unknown[] {
  const file = join(ARTIFACTS, `${contractName}.sol`, `${contractName}.json`);
  if (!existsSync(file)) {
    throw new Error(`Missing artifact ${file}. Run \`hardhat compile\` first.`);
  }

  const artifact = JSON.parse(readFileSync(file, "utf8")) as { abi: unknown[] };
  return artifact.abi;
}

function writeAbiModule(fileName: string, exportName: string, abi: unknown[]): string {
  const target = join(ABI_OUT, fileName);
  const body = `export const ${exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;

  writeFileSync(target, body);
  return target;
}

function writeAbiIndex(): string {
  const target = join(ABI_OUT, "index.ts");
  const body = [
    `export { moonLandRegistryAbi } from "./registry.js";`,
    `export { moonMarketplaceAbi } from "./marketplace.js";`,
    "",
  ].join("\n");

  writeFileSync(target, body);
  return target;
}

function writeWebEnv(chainId: string, registry: string, marketplace: string): string {
  const vars = new Map<string, string>();

  if (existsSync(WEB_ENV)) {
    for (const line of readFileSync(WEB_ENV, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      vars.set(trimmed.slice(0, separator), trimmed.slice(separator + 1));
    }
  }

  vars.set("NEXT_PUBLIC_CHAIN_ID", chainId);
  vars.set("NEXT_PUBLIC_REGISTRY_ADDRESS", registry);
  vars.set("NEXT_PUBLIC_MARKETPLACE_ADDRESS", marketplace);
  if (chainId === "31337") {
    vars.set("NEXT_PUBLIC_RPC_URL", LOCAL_RPC_URL);
  }

  const body = `${[...vars.entries()].map(([key, value]) => `${key}=${value}`).join("\n")}\n`;
  writeFileSync(WEB_ENV, body);
  return WEB_ENV;
}

function main(): void {
  const chainId = resolveChainId();
  const addresses = readDeployedAddresses(chainId);

  const registry = requireAddress(addresses, REGISTRY_FUTURE);
  const marketplace = requireAddress(addresses, MARKETPLACE_FUTURE);

  mkdirSync(DEPLOYMENTS_OUT, { recursive: true });
  mkdirSync(ABI_OUT, { recursive: true });

  const deploymentFile = join(DEPLOYMENTS_OUT, `${chainId}.json`);
  writeFileSync(
    deploymentFile,
    `${JSON.stringify({ chainId: Number(chainId), registry, marketplace }, null, 2)}\n`,
  );

  const registryAbiFile = writeAbiModule("registry.ts", "moonLandRegistryAbi", readAbi("MoonLandRegistry"));
  const marketplaceAbiFile = writeAbiModule("marketplace.ts", "moonMarketplaceAbi", readAbi("MoonMarketplace"));
  const indexFile = writeAbiIndex();
  const webEnvFile = writeWebEnv(chainId, registry, marketplace);

  console.log(`chainId      ${chainId}`);
  console.log(`registry     ${registry}`);
  console.log(`marketplace  ${marketplace}`);
  console.log(`wrote        ${deploymentFile}`);
  console.log(`wrote        ${registryAbiFile}`);
  console.log(`wrote        ${marketplaceAbiFile}`);
  console.log(`wrote        ${indexFile}`);
  console.log(`wrote        ${webEnvFile}`);
}

main();
