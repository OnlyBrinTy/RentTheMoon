import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getWagmiConfig } from "@/lib/wagmi";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LunarLease — Virtual Lunar Sectors",
    template: "%s · LunarLease",
  },
  description:
    "Acquire and rent virtual sectors of the Moon on Polygon. ERC-721 ownership with ERC-4907 rental rights.",
};

export const viewport: Viewport = {
  themeColor: "#04060f",
};

export default async function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const initialState = cookieToInitialState(
    getWagmiConfig(),
    requestHeaders.get("cookie"),
  );

  return (
    <html lang="en">
      <body className="starfield flex min-h-dvh flex-col antialiased">
        <Providers initialState={initialState}>
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
