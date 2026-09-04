"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  type Connector,
} from "wagmi";
import { activeChain, activeChainId } from "@/lib/config";
import { describeTransactionError, isAlreadyConnectedError } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { truncateAddress } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useToasts } from "@/components/ui/toast";

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

function walletLabel(connector: Connector): string {
  if (connector.name === "Injected") return "Browser wallet";
  return connector.name;
}

function visibleConnectors(connectors: readonly Connector[]): Connector[] {
  const discovered = connectors.filter((connector) => connector.id !== "injected");
  return discovered.length > 0 ? [...discovered] : [...connectors];
}

export function ConnectButton() {
  const { address, isConnected, chainId, connector: activeConnector } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting, error, reset } = useConnect();
  const { disconnect, disconnectAsync } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { push } = useToasts();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const menuRef = useDismissOnOutsideClick(() => setIsMenuOpen(false));
  const wallets = useMemo(() => visibleConnectors(connectors), [connectors]);
  const isBusy = isConnecting || isReconnecting;

  const isWrongNetwork = isConnected && chainId !== activeChainId;

  async function connectWallet(connector: Connector) {
    try {
      await connectAsync({ connector, chainId: activeChainId });
    } catch (connectError) {
      if (!isAlreadyConnectedError(connectError)) throw connectError;
      await disconnectAsync();
      await connectAsync({ connector, chainId: activeChainId });
    }
  }

  async function handleConnect(connector: Connector) {
    setIsReconnecting(true);
    try {
      reset();
      await connectWallet(connector);
      setIsMenuOpen(false);
    } catch (connectError) {
      push({
        title: "Could not connect",
        description: describeTransactionError(connectError),
        variant: "error",
      });
    } finally {
      setIsReconnecting(false);
    }
  }

  if (!isConnected) {
    return (
      <div ref={menuRef} className="relative">
        <Button
          type="button"
          size="sm"
          isLoading={isBusy}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          Connect wallet
        </Button>
        {isMenuOpen ? (
          <div className="panel-surface animate-rise absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl p-1.5">
            {wallets.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-white/50">
                No wallet connectors available.
              </p>
            ) : (
              wallets.map((connector) => (
                <button
                  key={connector.uid}
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    void handleConnect(connector);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/8 hover:text-white disabled:opacity-50"
                >
                  {walletLabel(connector)}
                </button>
              ))
            )}
            {error ? (
              <p className="px-2.5 py-2 text-xs leading-relaxed text-rose-200/80">
                {describeTransactionError(error)}
              </p>
            ) : (
              <p className="px-2.5 py-2 text-[11px] leading-relaxed text-white/40">
                Use MetaMask or another browser extension. After connecting, switch it to
                Hardhat (chain 31337) at http://127.0.0.1:8545.
              </p>
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
          type="button"
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
              disabled={isBusy}
              onClick={() => {
                const connector = activeConnector ?? wallets[0];
                if (connector === undefined) return;
                void handleConnect(connector);
              }}
              className="mt-1 w-full rounded-lg px-2.5 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/8 disabled:opacity-50"
            >
              Switch account
            </button>
            <button
              type="button"
              onClick={() => {
                disconnect();
                setIsMenuOpen(false);
              }}
              className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-rose-200 transition-colors hover:bg-rose-500/12"
            >
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
