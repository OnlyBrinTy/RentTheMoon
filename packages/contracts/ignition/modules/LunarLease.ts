import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const INITIAL_SECTOR_PRICE_WEI = 100_000_000_000_000_000n;
const PLATFORM_FEE_BPS = 300;

export default buildModule("LunarLease", (m) => {
  const admin = m.getParameter("admin", m.getAccount(0));
  const initialSectorPrice = m.getParameter("initialSectorPrice", INITIAL_SECTOR_PRICE_WEI);
  const platformFeeBps = m.getParameter("platformFeeBps", PLATFORM_FEE_BPS);

  const registry = m.contract("MoonLandRegistry", [admin]);
  const marketplace = m.contract("MoonMarketplace", [
    registry,
    initialSectorPrice,
    platformFeeBps,
    admin,
  ]);

  const marketplaceRole = m.staticCall(registry, "MARKETPLACE_ROLE", []);
  m.call(registry, "grantRole", [marketplaceRole, marketplace], {
    id: "grantMarketplaceRoleToMarketplace",
  });

  return { registry, marketplace };
});
