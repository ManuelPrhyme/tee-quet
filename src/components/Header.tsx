import { ConnectButton } from "@mysten/dapp-kit";
import { ThemeToggle } from "./ThemeToggle";
import { WalletBalances } from "./WalletBalances";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2">
          <img src="/nav.png" alt="Tee-Quet" className="h-9" />
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <a href="/" className="hover:text-accent">Browse</a>
          <a href="/create" className="hover:text-accent">Host an event</a>
        </nav>
        <div className="flex items-center gap-3">
          <WalletBalances />
          <ThemeToggle />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
