// Tee-queter on-chain configuration.
// After publishing the Move package (see /move/README.md), paste the values below.

export const SUI_NETWORK = "testnet" as const;

// Replace after `sui client publish`:
export const PACKAGE_ID = "0x0"; // tee_queter package id
export const PLATFORM_CONFIG_ID = "0x0"; // shared PlatformConfig object id (from publish tx)

// Faucet USDC type on Sui testnet (Circle test). Replace if you prefer another coin.
// Default: https://faucet.circle.com testnet USDC
export const USDC_COIN_TYPE =
  "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";

export const USDC_DECIMALS = 6;
export const EVENT_CREATION_FEE_USDC = 5; // 5 USDC

export const WALRUS_AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

export const isContractConfigured = () =>
  PACKAGE_ID !== "0x0" && PLATFORM_CONFIG_ID !== "0x0";
