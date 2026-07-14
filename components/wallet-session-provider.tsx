"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BrowserWallet } from "@/lib/solana-client";

type WalletSession = {
  wallet: BrowserWallet | null;
  walletKey: string;
  connect: () => Promise<string>;
  disconnect: () => Promise<void>;
};

const WalletSessionContext = createContext<WalletSession | null>(null);

export function WalletSessionProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<BrowserWallet | null>(() =>
    typeof window === "undefined" ? null : window.solana ?? null,
  );
  const [walletKey, setWalletKey] = useState("");

  useEffect(() => {
    const provider = window.solana;
    if (!provider?.isPhantom) return;
    let active = true;

    const syncAccount = (publicKey: typeof provider.publicKey = provider.publicKey) => {
      if (active) setWalletKey(publicKey?.toBase58() ?? "");
    };
    const clearAccount = () => { if (active) setWalletKey(""); };

    queueMicrotask(() => {
      if (!active) return;
      setWallet(provider);
      syncAccount();
    });
    provider.connect({ onlyIfTrusted: true }).then(({ publicKey }) => {
      if (!active) return;
      setWallet(provider);
      syncAccount(publicKey);
    }).catch(() => undefined);
    provider.on?.("connect", syncAccount);
    provider.on?.("accountChanged", syncAccount);
    provider.on?.("disconnect", clearAccount);
    return () => {
      active = false;
      provider.off?.("connect", syncAccount);
      provider.off?.("accountChanged", syncAccount);
      provider.off?.("disconnect", clearAccount);
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = window.solana;
    if (!provider?.isPhantom) throw new Error("Phantom was not detected in this browser");
    const result = await provider.connect();
    const key = result.publicKey.toBase58();
    setWallet(provider);
    setWalletKey(key);
    return key;
  }, []);

  const disconnect = useCallback(async () => {
    if (wallet) await wallet.disconnect();
    setWalletKey("");
  }, [wallet]);

  const value = useMemo(() => ({ wallet, walletKey, connect, disconnect }), [wallet, walletKey, connect, disconnect]);
  return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

export function useWalletSession() {
  const session = useContext(WalletSessionContext);
  if (!session) throw new Error("useWalletSession must be used inside WalletSessionProvider");
  return session;
}
