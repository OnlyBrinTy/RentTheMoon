import type { Metadata } from "next";
import { MyLandView } from "@/components/pages/my-land-view";

export const metadata: Metadata = {
  title: "My Land",
  description: "Lunar sectors owned by your connected wallet.",
};

export default function MyLandPage() {
  return <MyLandView />;
}
