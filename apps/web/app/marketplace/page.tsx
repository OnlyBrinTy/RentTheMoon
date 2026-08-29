import type { Metadata } from "next";
import { MarketplaceView } from "@/components/pages/marketplace-view";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Lunar sectors for sale and available to rent.",
};

export default function MarketplacePage() {
  return <MarketplaceView />;
}
