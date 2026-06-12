import { WalrusClient } from "@mysten/walrus";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";

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

// The interface WalrusClient.#executeTransaction actually needs
export interface WalrusSigner {
  toSuiAddress: () => string;
  signAndExecuteTransaction: (args: { transaction: unknown; client: unknown }) => Promise<unknown>;
}

export async function uploadImage(
  file: File,
  signer: WalrusSigner,
  epochs = 5,
): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const client = getWalrusClient();
  const { blobId } = await client.writeBlob({
    blob: buf,
    deletable: true,
    epochs,
    signer: signer as never,
  });
  return blobId;
}

export function walrusImageUrl(blobId: string): string {
  return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
  
}


