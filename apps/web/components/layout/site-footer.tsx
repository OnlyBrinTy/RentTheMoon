import { activeChain, marketplaceAddress, registryAddress } from "@/lib/config";
import { truncateAddress } from "@/lib/format";
import { LegalNotice } from "@/components/ui/legal-notice";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/6 bg-black/25">
      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.16em] text-white/60 uppercase">
            Legal notice
          </p>
          <LegalNotice className="max-w-2xl" />
        </div>

        <dl className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-white/40">Network</dt>
            <dd className="text-white/70">{activeChain.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-white/40">Registry</dt>
            <dd className="numeric text-white/70">
              {registryAddress ? truncateAddress(registryAddress, 6) : "not configured"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-white/40">Marketplace</dt>
            <dd className="numeric text-white/70">
              {marketplaceAddress
                ? truncateAddress(marketplaceAddress, 6)
                : "not configured"}
            </dd>
          </div>
        </dl>
      </div>
    </footer>
  );
}
