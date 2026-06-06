import { useEffect, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { USDC_COIN_TYPE, USDC_DECIMALS } from "@/lib/sui-config";

const WAL_COIN_TYPE = "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL";
const SUI_DECIMALS = 9;
const WAL_DECIMALS = 9;

function fmt(raw: string, decimals: number, dp = 2) {
  const n = Number(raw) / 10 ** decimals;
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function WalletBalances() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [balances, setBalances] = useState<{ sui: string; wal: string; usdc: string } | null>(null);

  useEffect(() => {
    if (!account) { setBalances(null); return; }

    async function load() {
      const [sui, wal, usdc] = await Promise.all([
        client.getBalance({ owner: account!.address, coinType: "0x2::sui::SUI" }),
        client.getBalance({ owner: account!.address, coinType: WAL_COIN_TYPE }).catch(() => ({ totalBalance: "0" })),
        client.getBalance({ owner: account!.address, coinType: USDC_COIN_TYPE }).catch(() => ({ totalBalance: "0" })),
      ]);

      console.log("The SUI Token Objects",sui)
      setBalances({
        sui: fmt(sui.totalBalance, SUI_DECIMALS),
        wal: fmt(wal.totalBalance, WAL_DECIMALS),
        usdc: fmt(usdc.totalBalance, USDC_DECIMALS),
      });
    }

    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [account, client]);

  if (!account || !balances) return null;

  return (
    <div className="hidden items-center gap-3 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium md:flex">
      <span className="flex items-center gap-1">
        <span className="text-muted-foreground">SUI</span>
        <span>{balances.sui}</span>
      </span>
      <span className="text-border">·</span>
      <span className="flex items-center gap-1">
        <span className="text-muted-foreground">WAL</span>
        <span>{balances.wal}</span>
      </span>
      <span className="text-border">·</span>
      <span className="flex items-center gap-1">
        <span className="text-muted-foreground">USDC</span>
        <span>{balances.usdc}</span>
      </span>
    </div>
  );
}
