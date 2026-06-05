import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useCurrentWallet,
} from "@mysten/dapp-kit";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { buildCreateEventTx } from "@/lib/contract";
import { uploadImage } from "@/lib/walrus";
import {
  EVENT_CREATION_FEE_USDC,
  isContractConfigured,
} from "@/lib/sui-config";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Host an event · Tee-queter" },
      {
        name: "description",
        content:
          "Mint a Tee-queter event: upload your ticket cover to Walrus, set a USDC price, and we'll shared-object it on Sui.",
      },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const client = useSuiClient();
  const navigate = useNavigate();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [busy, setBusy] = useState<"idle" | "uploading" | "creating">("idle");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(10);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const onPickFile = (f: File | null) => {
    setCover(f);
    setCoverPreview(f ? URL.createObjectURL(f) : null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return toast.error("Connect your Sui wallet first");
    if (!cover) return toast.error("Upload a ticket cover image");
    if (!isContractConfigured())
      return toast.error("Contract not configured — see src/lib/sui-config.ts");

    const signer = (wallet.currentWallet as unknown as { signer?: unknown })?.signer;
    if (!signer) {
      return toast.error(
        "This wallet doesn't expose a signer for Walrus uploads. Try Sui Wallet or Suiet.",
      );
    }

    try {
      setBusy("uploading");
      toast.message("Uploading cover to Walrus…");
      const blobId = await uploadImage(cover, signer as never, 5);
      toast.success("Cover stored on Walrus");

      setBusy("creating");
      const tx = await buildCreateEventTx(client as never, account.address, {
        name,
        description,
        coverBlobId: blobId,
        priceUsdc: price,
      });
      const res = await signAndExecute({ transaction: tx });
      toast.success("Event created");
      console.log("create_event tx", res);
      navigate({ to: "/" });
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
        You'll pay a {EVENT_CREATION_FEE_USDC} USDC platform fee. The cover image
        is stored on Walrus; ownership of each ticket is coordinated by the Sui
        contract.
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

        <Field label="Ticket price (USDC)">
          <input
            type="number"
            min={0.1}
            step={0.1}
            required
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="input"
          />
        </Field>

        <Field label="Cover image">
          <label className="paper-card flex cursor-pointer items-center gap-4 border-dashed p-4 hover:border-foreground">
            {coverPreview ? (
              <img
                src={coverPreview}
                alt=""
                className="h-20 w-20 rounded-lg object-cover"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-lg bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="text-sm">
              <div className="font-medium">
                {cover ? cover.name : "Click to upload"}
              </div>
              <div className="text-muted-foreground">
                PNG/JPG — stored on Walrus testnet
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>

        <button
          disabled={busy !== "idle"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {busy !== "idle" && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy === "uploading"
            ? "Uploading to Walrus…"
            : busy === "creating"
              ? "Creating event…"
              : `Create event · ${EVENT_CREATION_FEE_USDC} USDC`}
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
