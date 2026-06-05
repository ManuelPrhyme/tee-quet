import { Link } from "@tanstack/react-router";
import { ConnectButton } from "@mysten/dapp-kit";
import { Ticket } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Ticket className="h-5 w-5" />
          </span>
          Tee-queter
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Link to="/" activeOptions={{ exact: true }} className="hover:text-accent [&.active]:text-accent">
            Browse
          </Link>
          <Link to="/create" className="hover:text-accent [&.active]:text-accent">
            Host an event
          </Link>
        </nav>
        <ConnectButton />
      </div>
    </header>
  );
}
