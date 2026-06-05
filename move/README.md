# Tee-queter Move package

## Publish

```bash
cd move
sui client switch --env testnet
sui client publish --gas-budget 200000000
```

From the publish output, copy:

- The package id → `PACKAGE_ID` in `src/lib/sui-config.ts`
- The created `PlatformConfig` object id → `PLATFORM_CONFIG_ID`

## USDC

The frontend defaults to Circle's faucet USDC on Sui testnet
(`0xa1ec…::usdc::USDC`). Grab some from <https://faucet.circle.com> and the Sui
testnet faucet for gas.

## Functions

- `create_event<T>(config, name, desc, cover_blob_id, price, fee, ctx)` — fee
  must be ≥ 5 USDC.
- `add_ticket<T>(event, blob_id, ctx)` — creator uploads to Walrus first, then
  registers the blob id.
- `buy_ticket<T>(event, payment, ctx)` — exact price; pops one blob and
  transfers a `Ticket` to the buyer.
