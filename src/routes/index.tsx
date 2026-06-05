import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { Ticket, Sparkles, Coins, ImageOff } from "lucide-react";
import { fetchAllEvents } from "@/lib/contract";
import { walrusImageUrl } from "@/lib/walrus";
import { isContractConfigured, EVENT_CREATION_FEE_USDC } from "@/lib/sui-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tee-queter — On-chain event tickets on Sui" },
      {
        name: "description",
        content:
          "Mint, browse and buy event tickets stored on Walrus and settled in USDC on Sui testnet.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const client = useSuiClient();
  const configured = isContractConfigured();
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => fetchAllEvents(client as never),
    enabled: configured,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <section className="relative grid gap-10 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
        <div className="space-y-6">
          <span className="chip">
            <Sparkles className="h-3.5 w-3.5" /> Sui Testnet · Walrus storage
          </span>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Tickets that travel
            <span className="text-accent">.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Host an event, drop the artwork on Walrus, and let fans claim tickets
            with USDC. Ownership is coordinated on a Sui smart contract — no
            middlemen, no scalpers.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/create"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Host an event
              <Coins className="h-4 w-4" /> {EVENT_CREATION_FEE_USDC} USDC
            </Link>
            <a
              href="#events"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:border-foreground"
            >
              Browse drops
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="paper-card aspect-[4/5] rotate-2 overflow-hidden">
            <div className="grid h-full grid-rows-[1.4fr_1fr]">
              <div className="bg-gradient-to-br from-[color:var(--coral)] via-[color:var(--butter)] to-[color:var(--mint)]" />
              <div className="space-y-2 p-6">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Tee-queter · ticket
                </div>
                <div className="font-display text-2xl font-bold">
                  Future of live
                </div>
                <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
                  <span>Walrus blob · 0x…a9f</span>
                  <span>USDC · Sui</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!configured && (
        <div className="paper-card mb-10 border-dashed bg-butter/40 p-5 text-sm">
          <strong>Setup needed:</strong> publish the Move package under{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">/move</code> and paste
          its <code>PACKAGE_ID</code> and <code>PLATFORM_CONFIG_ID</code> into{" "}
          <code>src/lib/sui-config.ts</code>.
        </div>
      )}

      <section id="events" className="space-y-6">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold">Available drops</h2>
          <span className="text-sm text-muted-foreground">
            {events?.length ?? 0} live
          </span>
        </div>

        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="paper-card aspect-[3/4] animate-pulse bg-muted"
              />
            ))}
          </div>
        )}

        {!isLoading && (!events || events.length === 0) && (
          <div className="paper-card flex flex-col items-center justify-center gap-3 p-16 text-center">
            <ImageOff className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No drops yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Be the first to mint a Tee-queter event. Pay {EVENT_CREATION_FEE_USDC}{" "}
              USDC and upload ticket art to Walrus.
            </p>
            <Link
              to="/create"
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
            >
              <Ticket className="h-4 w-4" /> Create event
            </Link>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events?.map((e) => (
            <Link
              key={e.id}
              to="/events/$eventId"
              params={{ eventId: e.id }}
              className="paper-card group block overflow-hidden transition hover:-translate-y-1"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {e.coverBlobId ? (
                  <img
                    src={walrusImageUrl(e.coverBlobId)}
                    alt={e.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[color:var(--mint)] to-[color:var(--butter)]" />
                )}
              </div>
              <div className="space-y-2 p-5">
                <div className="flex items-center justify-between">
                  <span className="chip">{e.availableCount} left</span>
                  <span className="text-sm font-semibold">
                    {e.price} USDC
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold">{e.name}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {e.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
