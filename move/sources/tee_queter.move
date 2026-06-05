/// Tee-queter — event ticketing coordinated on Sui, ticket art stored on Walrus.
///
/// Flow:
///   1. Publisher runs `init` which creates a shared `PlatformConfig` and an `AdminCap`.
///   2. Creator calls `create_event` paying the 5 USDC platform fee. Returns/shares an `Event<T>`.
///   3. Creator calls `add_ticket` for each Walrus blob id they uploaded.
///   4. Buyer calls `buy_ticket` paying the configured price; receives a `Ticket` NFT
///      whose `blob_id` points to the Walrus image. Payment goes to the creator.
///
/// `T` is the payment coin type. For Tee-queter on testnet we use faucet USDC.
module tee_queter::tee_queter;

use std::string::{Self, String};
use sui::coin::{Self, Coin};
use sui::event;
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use sui::object::{Self, UID, ID};

// --- Errors ---
const EInsufficientFee: u64 = 1;
const EWrongPrice: u64 = 2;
const ENotCreator: u64 = 3;
const ESoldOut: u64 = 4;

// 5 USDC, 6 decimals
const CREATION_FEE: u64 = 5_000_000;

// --- Capabilities & config ---
public struct AdminCap has key, store { id: UID }

public struct PlatformConfig has key {
    id: UID,
    fee_recipient: address,
}

// --- Event & Ticket ---
public struct Event<phantom T> has key {
    id: UID,
    creator: address,
    name: String,
    description: String,
    cover_blob_id: String,
    price: u64, // in T smallest units
    available_blobs: vector<String>,
    sold_count: u64,
}

public struct Ticket has key, store {
    id: UID,
    event_id: ID,
    event_name: String,
    blob_id: String,
}

// --- Events emitted ---
public struct EventCreated has copy, drop {
    event_id: ID,
    creator: address,
    name: String,
    price: u64,
}

public struct TicketAdded has copy, drop {
    event_id: ID,
    blob_id: String,
}

public struct TicketSold has copy, drop {
    event_id: ID,
    buyer: address,
    blob_id: String,
}

// --- Init ---
fun init(ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    transfer::transfer(AdminCap { id: object::new(ctx) }, sender);
    transfer::share_object(PlatformConfig {
        id: object::new(ctx),
        fee_recipient: sender,
    });
}

public entry fun set_fee_recipient(
    _: &AdminCap,
    config: &mut PlatformConfig,
    new_recipient: address,
) {
    config.fee_recipient = new_recipient;
}

// --- Create event ---
public entry fun create_event<T>(
    config: &PlatformConfig,
    name: vector<u8>,
    description: vector<u8>,
    cover_blob_id: vector<u8>,
    price: u64,
    fee: Coin<T>,
    ctx: &mut TxContext,
) {
    assert!(coin::value(&fee) >= CREATION_FEE, EInsufficientFee);
    transfer::public_transfer(fee, config.fee_recipient);

    let event_obj = Event<T> {
        id: object::new(ctx),
        creator: tx_context::sender(ctx),
        name: string::utf8(name),
        description: string::utf8(description),
        cover_blob_id: string::utf8(cover_blob_id),
        price,
        available_blobs: vector::empty<String>(),
        sold_count: 0,
    };

    event::emit(EventCreated {
        event_id: object::id(&event_obj),
        creator: tx_context::sender(ctx),
        name: event_obj.name,
        price,
    });

    transfer::share_object(event_obj);
}

// --- Add ticket blob (creator only) ---
public entry fun add_ticket<T>(
    event_obj: &mut Event<T>,
    blob_id: vector<u8>,
    ctx: &TxContext,
) {
    assert!(tx_context::sender(ctx) == event_obj.creator, ENotCreator);
    let blob = string::utf8(blob_id);
    vector::push_back(&mut event_obj.available_blobs, blob);
    event::emit(TicketAdded { event_id: object::id(event_obj), blob_id: blob });
}

// --- Buy ticket ---
public entry fun buy_ticket<T>(
    event_obj: &mut Event<T>,
    payment: Coin<T>,
    ctx: &mut TxContext,
) {
    assert!(coin::value(&payment) == event_obj.price, EWrongPrice);
    let n = vector::length(&event_obj.available_blobs);
    assert!(n > 0, ESoldOut);

    transfer::public_transfer(payment, event_obj.creator);

    let blob = vector::pop_back(&mut event_obj.available_blobs);
    event_obj.sold_count = event_obj.sold_count + 1;

    let buyer = tx_context::sender(ctx);
    let ticket = Ticket {
        id: object::new(ctx),
        event_id: object::id(event_obj),
        event_name: event_obj.name,
        blob_id: blob,
    };

    event::emit(TicketSold { event_id: object::id(event_obj), buyer, blob_id: ticket.blob_id });
    transfer::public_transfer(ticket, buyer);
}

// --- Read-only views (for tooling/tests) ---
public fun available_count<T>(event_obj: &Event<T>): u64 {
    vector::length(&event_obj.available_blobs)
}
