import { useState, useEffect } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { Ticket, Sparkles, Coins, ImageOff } from "lucide-react";
import { fetchAllEvents } from "@/lib/contract";
import { walrusImageUrl } from "@/lib/walrus";
import { isContractConfigured, EVENT_CREATION_FEE_USDC } from "@/lib/sui-config";
import type { EventSummary } from "@/lib/contract";

interface HomePageProps {
  navigate: (to: string) => void;
}

export function HomePage({ navigate }: HomePageProps) {
  const client = useSuiClient();
  const configured = isContractConfigured();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!configured) return;
    setIsLoading(true);
    fetchAllEvents(client as never)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [client, configured]);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <section className="relative grid gap-10 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
        <div className="space-y-6">
          {/* <span className="chip">
            <Sparkles className="h-3.5 w-3.5" /> Sui Testnet · Walrus storage
          </span> */}
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
            <a
              href="/create"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Host an event
              <Coins className="h-4 w-4" /> {EVENT_CREATION_FEE_USDC} USDC
            </a>
            <a
              href="#events"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:border-foreground"
            >
              Browse drops
            </a>
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="paper-card aspect-[4/5] rotate-2 overflow-hidden">
            <div className="grid h-full grid-rows-[1.4fr_1fr]">
              {/* Gradient bg with ticket overlaid */}
              <div className="relative bg-gradient-to-br from-[color:var(--coral)] via-[color:var(--butter)] to-[color:var(--mint)]">
                {/* Ticket shape */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[72%]">
                    {/* Ticket body */}
                    <div className="rounded-2xl bg-white/90 shadow-2xl px-5 pt-5 pb-3 backdrop-blur-sm">
                      {/* Ticket top strip */}
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-coral" style={{ color: 'var(--coral)' }}>Tee-qet</span>
                        <Ticket className="h-4 w-4" style={{ color: 'var(--coral)' }} />
                      </div>
                      {/* Barcode-like lines */}
                      <div className="flex gap-[3px] mb-3">
                        {[3,1,4,1,5,2,3,1,2,4,1,3,2,5,1,2,3,1,4,2].map((w, i) => (
                          <div
                            key={i}
                            className="rounded-sm bg-ink/80"
                            style={{ width: `${w * 2}px`, height: '36px', background: 'var(--ink)' }}
                          />
                        ))}
                      </div>
                      {/* Dashed perforation */}
                      <div className="-mx-5 border-t border-dashed border-black/20 mb-3" />
                      <div className="text-[9px] font-mono text-center text-black/40 tracking-widest">0x…a9f · USDC · SUI</div>
                    </div>
                    {/* Tear notches */}
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-gradient-to-br from-[color:var(--coral)] via-[color:var(--butter)] to-[color:var(--mint)]" />
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-gradient-to-br from-[color:var(--coral)] via-[color:var(--butter)] to-[color:var(--mint)]" />
                  </div>
                </div>
              </div>
              <div className="space-y-2 p-6">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Tee-qet · ticket
                </div>
                <div className="font-display text-2xl font-bold">Future of Live</div>
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
          <span className="text-sm text-muted-foreground">{events.length} live</span>
        </div>

        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="paper-card aspect-[3/4] animate-pulse bg-muted" />
            ))}
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="paper-card flex flex-col items-center justify-center gap-3 p-16 text-center">
            <ImageOff className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No drops yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Be the first to mint a Tee-qet event. Pay {EVENT_CREATION_FEE_USDC}{" "}
              USDC and upload ticket art to Walrus.
            </p>
            <a
              href="/create"
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
            >
              <Ticket className="h-4 w-4" /> Create event
            </a>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <a
              key={e.id}
              href={`/events/${e.id}`}
              className="paper-card group block overflow-hidden transition hover:-translate-y-1"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {e.coverBlobId ? (
                  <EventImage src={walrusImageUrl(e.coverBlobId)} alt={e.name} />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[color:var(--mint)] to-[color:var(--butter)]" />
                )}
              </div>
              <div className="space-y-2 p-5">
                <div className="flex items-center justify-between">
                  <span className="chip">{e.availableCount} left</span>
                  <span className="text-sm font-semibold">{e.price} USDC</span>
                </div>
                <h3 className="font-display text-xl font-bold">{e.name}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function EventImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}
