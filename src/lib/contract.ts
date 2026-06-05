import { Transaction } from "@mysten/sui/transactions";
import { SuiJsonRpcClient as SuiClient } from "@mysten/sui/jsonRpc";
import {
  PACKAGE_ID,
  PLATFORM_CONFIG_ID,
  USDC_COIN_TYPE,
  USDC_DECIMALS,
  EVENT_CREATION_FEE_USDC,
} from "./sui-config";

export const toBase = (amount: number) =>
  BigInt(Math.round(amount * 10 ** USDC_DECIMALS));

export const fromBase = (base: bigint | string | number) =>
  Number(base) / 10 ** USDC_DECIMALS;

async function pickUsdcCoin(
  client: SuiClient,
  owner: string,
  needed: bigint,
): Promise<{ id: string; balance: bigint }[]> {
  const coins = await client.getCoins({ owner, coinType: USDC_COIN_TYPE });
  const picked: { id: string; balance: bigint }[] = [];
  let total = 0n;
  for (const c of coins.data) {
    picked.push({ id: c.coinObjectId, balance: BigInt(c.balance) });
    total += BigInt(c.balance);
    if (total >= needed) break;
  }
  if (total < needed) throw new Error("Not enough USDC in wallet");
  return picked;
}

async function splitUsdc(
  tx: Transaction,
  client: SuiClient,
  owner: string,
  amount: bigint,
) {
  const coins = await pickUsdcCoin(client, owner, amount);
  const [primary, ...rest] = coins;
  const primaryRef = tx.object(primary.id);
  if (rest.length) {
    tx.mergeCoins(
      primaryRef,
      rest.map((c) => tx.object(c.id)),
    );
  }
  const [paid] = tx.splitCoins(primaryRef, [tx.pure.u64(amount)]);
  return paid;
}

export async function buildCreateEventTx(
  client: SuiClient,
  sender: string,
  params: {
    name: string;
    description: string;
    coverBlobId: string;
    priceUsdc: number;
  },
) {
  const tx = new Transaction();
  const fee = await splitUsdc(tx, client, sender, toBase(EVENT_CREATION_FEE_USDC));
  tx.moveCall({
    target: `${PACKAGE_ID}::tee_queter::create_event`,
    typeArguments: [USDC_COIN_TYPE],
    arguments: [
      tx.object(PLATFORM_CONFIG_ID),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(params.name))),
      tx.pure.vector(
        "u8",
        Array.from(new TextEncoder().encode(params.description)),
      ),
      tx.pure.vector(
        "u8",
        Array.from(new TextEncoder().encode(params.coverBlobId)),
      ),
      tx.pure.u64(toBase(params.priceUsdc)),
      fee,
    ],
  });
  return tx;
}

export function buildAddTicketTx(eventId: string, blobId: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::tee_queter::add_ticket`,
    typeArguments: [USDC_COIN_TYPE],
    arguments: [
      tx.object(eventId),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(blobId))),
    ],
  });
  return tx;
}

export async function buildBuyTicketTx(
  client: SuiClient,
  sender: string,
  eventId: string,
  priceUsdc: number,
) {
  const tx = new Transaction();
  const payment = await splitUsdc(tx, client, sender, toBase(priceUsdc));
  tx.moveCall({
    target: `${PACKAGE_ID}::tee_queter::buy_ticket`,
    typeArguments: [USDC_COIN_TYPE],
    arguments: [tx.object(eventId), payment],
  });
  return tx;
}

export type EventSummary = {
  id: string;
  creator: string;
  name: string;
  description: string;
  coverBlobId: string;
  price: number; // in USDC
  availableCount: number;
  soldCount: number;
  availableBlobs: string[];
};

export async function fetchAllEvents(client: SuiClient): Promise<EventSummary[]> {
  // Query EventCreated events to discover shared Event objects.
  const evts = await client.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::tee_queter::EventCreated` },
    limit: 50,
    order: "descending",
  });
  const ids = evts.data
    .map((e) => (e.parsedJson as { event_id?: string } | null)?.event_id)
    .filter((x): x is string => !!x);
  if (ids.length === 0) return [];
  const objs = await client.multiGetObjects({
    ids,
    options: { showContent: true, showType: true },
  });
  const out: EventSummary[] = [];
  for (const o of objs) {
    const c = o.data?.content;
    if (!c || c.dataType !== "moveObject") continue;
    const f = c.fields as {
      creator: string;
      name: string;
      description: string;
      cover_blob_id: string;
      price: string;
      available_blobs: string[];
      sold_count: string;
    };
    out.push({
      id: o.data!.objectId,
      creator: f.creator,
      name: f.name,
      description: f.description,
      coverBlobId: f.cover_blob_id,
      price: fromBase(f.price),
      availableCount: f.available_blobs.length,
      soldCount: Number(f.sold_count),
      availableBlobs: f.available_blobs,
    });
  }
  return out;
}

export async function fetchEvent(
  client: SuiClient,
  id: string,
): Promise<EventSummary | null> {
  const o = await client.getObject({
    id,
    options: { showContent: true, showType: true },
  });
  const c = o.data?.content;
  if (!c || c.dataType !== "moveObject") return null;
  const f = c.fields as {
    creator: string;
    name: string;
    description: string;
    cover_blob_id: string;
    price: string;
    available_blobs: string[];
    sold_count: string;
  };
  return {
    id: o.data!.objectId,
    creator: f.creator,
    name: f.name,
    description: f.description,
    coverBlobId: f.cover_blob_id,
    price: fromBase(f.price),
    availableCount: f.available_blobs.length,
    soldCount: Number(f.sold_count),
    availableBlobs: f.available_blobs,
  };
}
