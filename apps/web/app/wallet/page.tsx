import type { Metadata } from "next";
import { WalletView } from "@/components/pages/wallet-view";

export const metadata: Metadata = {
  title: "MUN Wallet",
  description: "Top up, send and farm MUN, the LunarLease marketplace currency.",
};

export default function WalletPage() {
  return <WalletView />;
}
