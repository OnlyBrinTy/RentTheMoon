"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ConnectButton } from "@/components/wallet/connect-button";

const navigation = [
  { href: "/", label: "Moon" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/my-land", label: "My Land" },
  { href: "/my-rentals", label: "My Rentals" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-white/6 bg-[color-mix(in_oklab,var(--color-void)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex size-8 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-500 opacity-90" />
            <span className="absolute inset-0 rounded-full shadow-[inset_-4px_-3px_6px_rgba(0,0,0,0.55)]" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-[0.18em] text-white/95">
              LUNARLEASE
            </span>
            <span className="mt-0.5 text-[10px] tracking-[0.14em] text-white/35">
              VIRTUAL LUNAR SECTORS
            </span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {navigation.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:bg-white/6 hover:text-white/85",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ConnectButton />
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-white/6 px-4 py-2 md:hidden">
        {navigation.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/55 hover:bg-white/6 hover:text-white/85",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
