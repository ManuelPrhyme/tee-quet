import type { ReactNode } from "react";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import "@mysten/dapp-kit/dist/index.css";

const networks = {
  testnet: { url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" as const },
};

export function SuiProviders({ children }: { children: ReactNode }) {
  return (
    <SuiClientProvider networks={networks} defaultNetwork="testnet">
      <WalletProvider autoConnect>{children}</WalletProvider>
    </SuiClientProvider>
  );
}
