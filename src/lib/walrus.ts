import { WalrusClient, NotEnoughBlobConfirmationsError } from "@mysten/walrus";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";

let cached: WalrusClient | null = null;

export function getWalrusClient(): WalrusClient {
  if (cached) return cached;
  const suiClient = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  });
  cached = new WalrusClient({
    network: "testnet",
    suiClient,
    storageNodeClientOptions: {
      timeout: 10_000, // fail fast on slow nodes (default is 30s)
    },
  });
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
  retries = 3,
): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const client = getWalrusClient();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { blobId } = await client.writeBlob({
        blob: buf,
        deletable: true,
        epochs,
        signer: signer as never,
      });
      return blobId;
    } catch (e) {
      if (e instanceof NotEnoughBlobConfirmationsError && attempt < retries) {
        continue; // retry
      }
      throw e;
    }
  }

  throw new Error("uploadImage: unreachable");
}

export function walrusImageUrl(blobId: string): string {
  return `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;
}
