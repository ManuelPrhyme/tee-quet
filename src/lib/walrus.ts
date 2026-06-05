import { WalrusClient } from "@mysten/walrus";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import type { Signer } from "@mysten/sui/cryptography";

let cached: WalrusClient | null = null;

export function getWalrusClient(): WalrusClient {
  if (cached) return cached;
  const suiClient = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  });
  cached = new WalrusClient({ network: "testnet", suiClient });
  return cached;
}

export async function uploadImage(
  file: File,
  signer: Signer,
  epochs = 5,
): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const client = getWalrusClient();
  const { blobId } = await client.writeBlob({
    blob: buf,
    deletable: false,
    epochs,
    signer,
  });
  return blobId;
}

export function walrusImageUrl(blobId: string): string {
  return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
}
