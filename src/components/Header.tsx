import { ConnectButton } from "@mysten/dapp-kit";
import { Ticket } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { WalletBalances } from "./WalletBalances";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Ticket className="h-5 w-5" />
          </span>
          Tee-qet
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
