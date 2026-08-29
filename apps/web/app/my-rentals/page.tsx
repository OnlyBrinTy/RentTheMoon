import type { Metadata } from "next";
import { MyRentalsView } from "@/components/pages/my-rentals-view";

export const metadata: Metadata = {
  title: "My Rentals",
  description: "Lunar sectors currently rented by your connected wallet.",
};

export default function MyRentalsPage() {
  return <MyRentalsView />;
}
