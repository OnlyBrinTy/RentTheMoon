"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { activeChain, activeChainId } from "@/lib/config";
import { cn } from "@/lib/cn";
import { truncateAddress } from "@/lib/format";
import { Button } from "@/components/ui/button";

function useDismissOnOutsideClick(onDismiss: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onDismiss]);

  return ref;
}

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useDismissOnOutsideClick(() => setIsMenuOpen(false));

  const isWrongNetwork = isConnected && chainId !== activeChainId;

  if (!isConnected) {
    return (
      <div ref={menuRef} className="relative">
        <Button
          size="sm"
          isLoading={isConnecting}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          Connect wallet
        </Button>
        {isMenuOpen ? (
          <div className="panel-surface animate-rise absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl p-1.5">
            {connectors.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-white/50">
                No wallet connectors available.
              </p>
            ) : (
              connectors.map((connector) => (
                <button
                  key={connector.uid}
                  type="button"
                  onClick={() => {
                    connect({ connector });
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/8 hover:text-white"
                >
                  {connector.name}
                  <span className="text-[10px] tracking-wide text-white/30 uppercase">
                    {connector.type}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isWrongNetwork ? (
        <Button
          size="sm"
          variant="danger"
          isLoading={isSwitching}
          onClick={() => switchChain({ chainId: activeChainId })}
        >
          Switch to {activeChain.name}
        </Button>
      ) : (
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/60 sm:inline-flex",
          )}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-emerald-400" />
          {activeChain.name}
        </span>
      )}

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="numeric inline-flex h-8 items-center gap-2 rounded-lg border border-white/12 bg-white/6 px-3 text-xs font-semibold text-white/85 transition-colors hover:bg-white/12"
        >
          {truncateAddress(address)}
        </button>
        {isMenuOpen ? (
          <div className="panel-surface animate-rise absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl p-1.5">
            <p className="numeric px-2.5 py-1.5 text-[11px] break-all text-white/40">
              {address}
            </p>
            <button
              type="button"
              onClick={() => {
                disconnect();
                setIsMenuOpen(false);
              }}
              className="mt-1 w-full rounded-lg px-2.5 py-2 text-left text-sm text-rose-200 transition-colors hover:bg-rose-500/12"
            >
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
