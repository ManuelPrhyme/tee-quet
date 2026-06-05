import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Ticket } from "lucide-react";
import {
  buildAddTicketTx,
  buildBuyTicketTx,
  fetchEvent,
} from "@/lib/contract";
import { uploadImage, walrusImageUrl } from "@/lib/walrus";

export const Route = createFileRoute("/events/$eventId")({
  head: ({ params }) => ({
    meta: [
      { title: `Event · Tee-queter` },
      {
        name: "description",
        content: `Buy a ticket for event ${params.eventId} on Tee-queter.`,
      },
    ],
  }),
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const client = useSuiClient();
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const qc = useQueryClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchEvent(client as never, eventId),
  });

  const isCreator = !!account && event?.creator === account.address;

  async function buy() {
    if (!account || !event) return;
    try {
      setBusy("buy");
      const tx = await buildBuyTicketTx(
        client as never,
        account.address,
        event.id,
        event.price,
      );
      await signAndExecute({ transaction: tx });
      toast.success("Ticket purchased — check your wallet");
      qc.invalidateQueries({ queryKey: ["event", eventId] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function addTicket(file: File) {
    if (!account || !event) return;
    const signer = (wallet.currentWallet as unknown as { signer?: unknown })?.signer;
    if (!signer) return toast.error("Wallet doesn't expose a signer for Walrus uploads");
    try {
      setBusy("add");
      toast.message("Uploading ticket art to Walrus…");
      const blobId = await uploadImage(file, signer as never, 5);
      const tx = buildAddTicketTx(event.id, blobId);
      await signAndExecute({ transaction: tx });
      toast.success("Ticket added");
      qc.invalidateQueries({ queryKey: ["event", eventId] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="paper-card h-96 animate-pulse bg-muted" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Event not found</h1>
        <Link to="/" className="mt-4 inline-block text-accent">
          ← Back to drops
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All drops
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[1.1fr_1fr]">
        <div className="paper-card overflow-hidden">
          <div className="aspect-[4/3] bg-muted">
            <img
              src={walrusImageUrl(event.coverBlobId)}
              alt={event.name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="space-y-5">
          <span className="chip">{event.availableCount} tickets left</span>
          <h1 className="font-display text-4xl font-bold leading-tight">
            {event.name}
          </h1>
          <p className="text-muted-foreground">{event.description}</p>

          <div className="paper-card flex items-center justify-between p-5">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Price
              </div>
              <div className="font-display text-3xl font-bold">
                {event.price} <span className="text-base font-medium text-muted-foreground">USDC</span>
              </div>
            </div>
            <button
              disabled={!account || event.availableCount === 0 || busy === "buy"}
              onClick={buy}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy === "buy" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ticket className="h-4 w-4" />
              )}
              {!account
                ? "Connect wallet"
                : event.availableCount === 0
                  ? "Sold out"
                  : "Claim ticket"}
            </button>
          </div>

          <div className="text-xs text-muted-foreground">
            Hosted by{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">
              {event.creator.slice(0, 6)}…{event.creator.slice(-4)}
            </code>{" "}
            · {event.soldCount} sold
          </div>
        </div>
      </div>

      <section className="mt-12 space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">Available tickets</h2>
          {isCreator && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-foreground">
              {busy === "add" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add ticket art
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) addTicket(f);
                }}
              />
            </label>
          )}
        </div>

        {event.availableBlobs.length === 0 ? (
          <div className="paper-card p-10 text-center text-sm text-muted-foreground">
            No tickets currently available.
            {isCreator && " Upload some art above to mint more."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {event.availableBlobs.map((blob) => (
              <div key={blob} className="paper-card overflow-hidden">
                <div className="aspect-[3/4] bg-muted">
                  <img
                    src={walrusImageUrl(blob)}
                    alt="Ticket art"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3 text-xs text-muted-foreground">
                  <div className="truncate font-mono">{blob.slice(0, 12)}…</div>
                  <div className="mt-0.5">Walrus blob · untransferred</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
