import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { cookieToInitialState, type State } from "wagmi";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { wagmiConfig } from "@/lib/wagmi";
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

function sanitizeInitialState(state: State | undefined): State | undefined {
  if (state === undefined) return undefined;
  return {
    ...state,
    connections: new Map(),
    current: null,
    status: "disconnected",
  };
}

export default async function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const initialState = sanitizeInitialState(
    cookieToInitialState(wagmiConfig, requestHeaders.get("cookie")),
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
