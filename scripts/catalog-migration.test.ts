import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20261025001000_create_catalog_tables.sql";
const rollbackPath = "supabase/rollbacks/20261025001000_create_catalog_tables.down.sql";
const ownedTables = [
  "catalog_products",
  "catalog_categories",
  "catalog_product_categories",
  "catalog_product_prices",
  "catalog_product_images",
];

async function files() {
  return {
    migration: await readFile(migrationPath, "utf8"),
    rollback: await readFile(rollbackPath, "utf8"),
  };
}

describe("catalog migration security contract", () => {
  it("defines ownership boundaries, constraints, indexes, RLS, and explicit privileges", async () => {
    const { migration } = await files();
    for (const table of ownedTables) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toMatch(new RegExp(`revoke all on table[\\s\\S]*${table}`));
      expect(migration).toMatch(new RegExp(`grant select on table[\\s\\S]*${table}`));
    }
    expect(migration).toContain("grant insert, update, delete on table");
    expect(migration).toContain("to authenticated;");
    expect(migration).toContain("catalog_product_prices_id_seq");
    expect(migration).toContain("catalog_product_images_id_seq");
    expect(migration).toContain("grant usage, select on sequence");
    expect(migration).toContain("references public.catalog_products(id) on delete cascade");
    expect(migration).toContain("references public.catalog_categories(id) on delete restrict");
    expect(migration).toContain("catalog_product_prices_snapshot_unique");
    expect(migration).toContain("catalog_products_availability_check");
    expect(migration).toContain("catalog_products_rating_check");
    expect(migration).toContain("catalog_products_public_read");
    expect(migration).toContain("catalog_products_admin_insert");
    expect(migration).toContain("catalog_products_admin_update");
    expect(migration).toContain("catalog_products_admin_delete");
    expect(migration).toContain("private.is_admin()");
    expect(migration).not.toMatch(/drop table/i);
    expect(migration).not.toMatch(/alter auth|disable row level security|service_role/i);
  });

  it("keeps public writes absent and makes public reads conditional", async () => {
    const { migration } = await files();
    expect(migration).toContain("to anon, authenticated;");
    expect(migration).toContain("grant insert, update, delete on table");
    const writeGrant = migration.match(/grant insert, update, delete on table[\s\S]*?to authenticated;/)?.[0] ?? "";
    expect(writeGrant).not.toContain("anon");
    expect(migration).toContain("using (available and not out_of_stock)");
    expect(migration).toContain("using (is_current and exists");
    expect(migration).toContain("using ((select private.is_admin()))");
    expect(migration).toContain("with check ((select private.is_admin()))");
  });

  it("limits rollback to the five tables owned by this migration and warns about data loss", async () => {
    const { migration, rollback } = await files();
    const created = [...migration.matchAll(/create table if not exists public\.(\w+)/g)].map(match => match[1]);
    const dropped = [...rollback.matchAll(/drop table if exists public\.(\w+)/g)].map(match => match[1]);
    expect(new Set(created)).toEqual(new Set(ownedTables));
    expect(dropped).toEqual([...ownedTables].reverse());
    for (const policy of [
      "catalog_product_images_public_read",
      "catalog_product_images_admin_all",
      "catalog_product_prices_public_read",
      "catalog_product_prices_admin_all",
      "catalog_product_categories_public_read",
      "catalog_product_categories_admin_all",
      "catalog_categories_public_read",
      "catalog_categories_admin_read",
      "catalog_categories_admin_insert",
      "catalog_categories_admin_update",
      "catalog_categories_admin_delete",
      "catalog_products_public_read",
      "catalog_products_admin_read",
      "catalog_products_admin_insert",
      "catalog_products_admin_update",
      "catalog_products_admin_delete",
    ]) {
      expect(rollback).toContain(`drop policy if exists ${policy}`);
    }
    expect(rollback).toMatch(/deletes all catalog data/i);
    expect(rollback).toMatch(/does not restore rows/i);
    expect(rollback).not.toMatch(/profiles|chat_messages|human_requests|auth\.users/);
  });
});
