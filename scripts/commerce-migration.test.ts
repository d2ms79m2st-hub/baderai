import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20261025020000_create_commerce_foundation.sql";
const rollbackPath = "supabase/rollbacks/20261025020000_create_commerce_foundation.down.sql";
const ownedTables = [
  "store_inventory",
  "store_inventory_movements",
  "store_orders",
  "store_order_items",
  "store_order_addresses",
  "store_order_events",
  "store_payment_events",
  "store_promotions",
  "store_settings",
];

async function files() {
  return {
    migration: await readFile(migrationPath, "utf8"),
    rollback: await readFile(rollbackPath, "utf8"),
  };
}

describe("commerce migration security contract", () => {
  it("defines the tables, foreign keys, constraints, RLS, and admin boundary", async () => {
    const { migration } = await files();
    for (const table of ownedTables) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain("references public.catalog_products(id) on delete restrict");
    expect(migration).toContain("references auth.users(id) on delete restrict");
    expect(migration).toContain("idempotency_key text not null unique");
    expect(migration).toContain("provider_event_id text not null unique");
    expect(migration).toContain("inventory_status in ('unknown','tracked','paused')");
    expect(migration).toContain("inventory_status <> 'tracked' or v_inventory.quantity_available is null");
    expect(migration).toContain("order_number := v_order_number");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public");
    expect(migration).toContain("private.is_admin()");
    expect(migration).not.toMatch(/disable row level security|service_role/i);
    expect(migration).not.toMatch(/insert into public\.store_inventory/i);
  });

  it("does not grant public or anonymous commerce writes or order creation", async () => {
    const { migration } = await files();
    expect(migration).toMatch(/revoke all on table[\s\S]*from anon, authenticated;/);
    expect(migration).toContain("grant select on table public.store_orders");
    expect(migration).toContain("revoke all on function public.store_create_order");
    expect(migration).toContain("grant execute on function public.store_create_order");
    expect(migration).toContain("grant usage on schema private to authenticated");
    expect(migration).toContain("grant execute on function private.is_admin() to authenticated");
    const executeGrant = migration.match(/grant execute on function[\s\S]*?to authenticated;/)?.[0] ?? "";
    expect(executeGrant).not.toContain("anon");
    expect(migration).toContain("create policy store_orders_owner_read");
    expect(migration).toContain("customer_id = (select auth.uid()) or (select private.is_admin())");
  });

  it("uses database prices and tracked inventory, not client-supplied prices", async () => {
    const { migration } = await files();
    expect(migration).toContain("from catalog_product_prices where product_id = v_product_id");
    expect(migration).toContain("v_price numeric(12,2)");
    expect(migration).toContain("v_inventory.inventory_status <> 'tracked'");
    expect(migration).toContain("v_inventory.quantity_available - v_inventory.quantity_reserved < v_quantity");
    expect(migration).toContain("insert into store_order_items");
    expect(migration).not.toContain("p_items->>'price'");
  });

  it("rolls back only its own tables and function", async () => {
    const { rollback } = await files();
    for (const table of ownedTables) expect(rollback).toContain(`drop table if exists public.${table}`);
    expect(rollback).toContain("drop function if exists public.store_create_order");
    expect(rollback).not.toMatch(/catalog_products|profiles|chat_messages|human_requests|auth\.users/i);
    expect(rollback).toMatch(/deletes commerce data/i);
  });
});
