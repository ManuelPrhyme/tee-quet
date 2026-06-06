import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { toast } from "sonner";
import { Upload, Loader2, Ticket } from "lucide-react";
import { buildCreateEventTx, buildAddTicketTx } from "@/lib/contract";
import { uploadImage } from "@/lib/walrus";
import { EVENT_CREATION_FEE_USDC, isContractConfigured, USDC_COIN_TYPE, USDC_DECIMALS } from "@/lib/sui-config";
import type { WalrusSigner } from "@/lib/walrus";

const WAL_COIN_TYPE = "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL";
const WAL_DECIMALS = 9;

interface CreatePageProps {
  navigate: (to: string) => void;
}

type BusyState = "idle" | "uploading-cover" | "creating" | { mintingTicket: number; total: number };

export function CreatePage({ navigate }: CreatePageProps) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [busy, setBusy] = useState<BusyState>("idle");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(10);
  const [ticketCount, setTicketCount] = useState(10);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [ticketArt, setTicketArt] = useState<File | null>(null);
  const [ticketArtPreview, setTicketArtPreview] = useState<string | null>(null);

  const isBusy = busy !== "idle";

  const onPickCover = (f: File | null) => {
    setCover(f);
    setCoverPreview(f ? URL.createObjectURL(f) : null);
  };

  const onPickTicketArt = (f: File | null) => {
    setTicketArt(f);
    setTicketArtPreview(f ? URL.createObjectURL(f) : null);
  };

  function busyLabel() {
    if (busy === "uploading-cover") return "Uploading cover to Walrus…";
    if (busy === "creating") return "Creating event on Sui…";
    if (typeof busy === "object")
      return `Minting ticket ${busy.mintingTicket} / ${busy.total}…`;
    return `Create event · ${EVENT_CREATION_FEE_USDC} USDC`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return toast.error("Connect your Sui wallet first");
    if (!cover) return toast.error("Upload a cover image");
    if (!ticketArt) return toast.error("Upload a ticket art image");
    if (ticketCount < 1) return toast.error("Ticket count must be at least 1");
    if (!isContractConfigured())
      return toast.error("Contract not configured — see src/lib/sui-config.ts");

    // Build a WalrusSigner adapter from the connected wallet
    const signer: WalrusSigner = {
      toSuiAddress: () => account!.address,
      signAndExecuteTransaction: async ({ transaction, client: suiClient }) => {
        const result = await signAndExecute(
          { transaction: transaction as never },
          { context: { client: suiClient } as never },
        );
        return { Transaction: result };
      },
    };

    // Check USDC and WAL balances before proceeding
    const [usdcBal, walBal] = await Promise.all([
      client.getBalance({ owner: account.address, coinType: USDC_COIN_TYPE }).catch(() => ({ totalBalance: "0" })),
      client.getBalance({ owner: account.address, coinType: WAL_COIN_TYPE }).catch(() => ({ totalBalance: "0" })),
    ]);
    const usdcAmount = Number(usdcBal.totalBalance) / 10 ** USDC_DECIMALS;
    const walAmount = Number(walBal.totalBalance) / 10 ** WAL_DECIMALS;

    if (usdcAmount < EVENT_CREATION_FEE_USDC) {
      return toast.error(`Insufficient USDC balance — you have ${usdcAmount.toFixed(2)} USDC, need at least ${EVENT_CREATION_FEE_USDC} USDC`);
    }
    if (walAmount < 0.1) {
      return toast.error(`Insufficient WAL balance — you need WAL to pay for Walrus storage (current: ${walAmount.toFixed(4)} WAL)`);
    }

    try {
      // 1. Upload cover
      setBusy("uploading-cover");
      toast.message("Uploading cover to Walrus…");
      const coverBlobId = await uploadImage(cover, signer as never, 2);
      console.log("Blob ID: ",coverBlobId)
      toast.success("Cover stored on Walrus");

      // 2. Create event on-chain
      setBusy("creating");
      const tx = await buildCreateEventTx(client as never, account.address, {
        name,
        description,
        coverBlobId,
        priceUsdc: price,
      });
      const createRes = await signAndExecute(
        { transaction: tx },
        { showEffects: true, showObjectChanges: true },
      );

      console.log("createRes", JSON.stringify(createRes, null, 2));

      // Try effects.created first, then objectChanges
      type CreatedObj = { reference?: { objectId: string }; owner?: unknown };
      type ObjChange = { type?: string; objectId?: string; owner?: unknown };

      const fromEffects = (createRes as { effects?: { created?: CreatedObj[] } })
        ?.effects?.created
        ?.find((o) => typeof o.owner === "object" && o.owner !== null && "Shared" in o.owner)
        ?.reference?.objectId;

      const fromChanges = (createRes as { objectChanges?: ObjChange[] })
        ?.objectChanges
        ?.find((o) => o.type === "created" && typeof o.owner === "object" && o.owner !== null && "Shared" in o.owner)
        ?.objectId;

      // Fallback: fetch from chain using digest
      let eventId = fromEffects ?? fromChanges;
      if (!eventId) {
        const digest = (createRes as { digest?: string })?.digest;
        if (digest) {
          await client.waitForTransaction({ digest });
          const txBlock = await client.getTransactionBlock({
            digest,
            options: { showEffects: true, showObjectChanges: true },
          });
          eventId = (txBlock as { effects?: { created?: CreatedObj[] } })
            ?.effects?.created
            ?.find((o) => typeof o.owner === "object" && o.owner !== null && "Shared" in o.owner)
            ?.reference?.objectId
            ?? (txBlock as { objectChanges?: ObjChange[] })
              ?.objectChanges
              ?.find((o) => o.type === "created" && typeof o.owner === "object" && o.owner !== null && "Shared" in o.owner)
              ?.objectId;
        }
      }

      if (!eventId) throw new Error("Could not find created event object ID in transaction result");
      toast.success(`Event created — minting ${ticketCount} tickets…`);

      // 3. Upload ticket art N times (each = unique blob) and register on-chain
      for (let i = 1; i <= ticketCount; i++) {
        setBusy({ mintingTicket: i, total: ticketCount });
        const blobId = await uploadImage(ticketArt, signer as never, 5);
        const addTx = buildAddTicketTx(eventId, blobId);
        await signAndExecute({ transaction: addTx });
      }

      toast.success(`All ${ticketCount} tickets minted!`);
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl font-bold">Host an event</h1>
      <p className="mt-2 text-muted-foreground">
        You'll pay a {EVENT_CREATION_FEE_USDC} USDC platform fee. Each ticket is uploaded as its
        own Walrus blob — every copy gets a unique blob ID.
      </p>

      <form onSubmit={handleSubmit} className="paper-card mt-8 space-y-6 p-6">
        <Field label="Event name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Sunset Sessions · Vol. 4"
          />
        </Field>

        <Field label="Description">
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input"
            placeholder="A night of live sets on the rooftop…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Ticket price (USDC)">
            <input
              type="number"
              min={0.1}
              step={0.1}
              required
              defaultValue={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="input"
              placeholder="e.g. 10"
            />
          </Field>
          <Field label="Number of tickets">
            <input
              type="number"
              min={1}
              step={1}
              required
              defaultValue={ticketCount}
              onChange={(e) => setTicketCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="input"
              placeholder="e.g. 10"
            />
          </Field>
        </div>

        <Field label="Cover image">
          <FilePicker
            file={cover}
            preview={coverPreview}
            onPick={onPickCover}
            hint="Event cover — PNG/JPG, stored on Walrus"
          />
        </Field>

        <Field label="Ticket art">
          <FilePicker
            file={ticketArt}
            preview={ticketArtPreview}
            onPick={onPickTicketArt}
            hint={`Uploaded ${ticketCount}× as individual blobs — each ticket gets its own unique blob ID`}
            icon={<Ticket className="h-6 w-6 text-muted-foreground" />}
          />
        </Field>

        {/* Mint progress bar */}
        {typeof busy === "object" && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Minting tickets on Walrus + Sui…</span>
              <span>{busy.mintingTicket} / {busy.total}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${(busy.mintingTicket / busy.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <button
          disabled={isBusy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busyLabel()}
        </button>
      </form>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          padding: 0.625rem 0.875rem;
          font-size: 0.95rem;
          outline: none;
        }
        .input:focus { border-color: var(--color-ring); box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-ring) 25%, transparent); }
        .input::placeholder { color: var(--color-muted-foreground); opacity: 0.45; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function FilePicker({
  file,
  preview,
  onPick,
  hint,
  icon,
}: {
  file: File | null;
  preview: string | null;
  onPick: (f: File | null) => void;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="paper-card flex cursor-pointer items-center gap-4 border-dashed p-4 hover:border-foreground">
      {preview ? (
        <img src={preview} alt="" className="h-20 w-20 rounded-lg object-cover" />
      ) : (
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-muted">
          {icon ?? <Upload className="h-6 w-6 text-muted-foreground" />}
        </div>
      )}
      <div className="text-sm">
        <div className="font-medium">{file ? file.name : "Click to upload"}</div>
        <div className="text-muted-foreground">{hint}</div>
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
