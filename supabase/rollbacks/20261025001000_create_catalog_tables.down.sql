-- Manual rollback for 20261025001000_create_catalog_tables.sql.
-- Review carefully before use. This file has not been executed.
-- WARNING: running this rollback deletes all catalog data in these five tables.
-- It does not restore rows or undo imports. Take a backup before using it.

drop policy if exists catalog_product_images_public_read on public.catalog_product_images;
drop policy if exists catalog_product_images_admin_all on public.catalog_product_images;
drop policy if exists catalog_product_prices_public_read on public.catalog_product_prices;
drop policy if exists catalog_product_prices_admin_all on public.catalog_product_prices;
drop policy if exists catalog_product_categories_public_read on public.catalog_product_categories;
drop policy if exists catalog_product_categories_admin_all on public.catalog_product_categories;
drop policy if exists catalog_categories_public_read on public.catalog_categories;
drop policy if exists catalog_categories_admin_read on public.catalog_categories;
drop policy if exists catalog_categories_admin_insert on public.catalog_categories;
drop policy if exists catalog_categories_admin_update on public.catalog_categories;
drop policy if exists catalog_categories_admin_delete on public.catalog_categories;
drop policy if exists catalog_products_public_read on public.catalog_products;
drop policy if exists catalog_products_admin_read on public.catalog_products;
drop policy if exists catalog_products_admin_insert on public.catalog_products;
drop policy if exists catalog_products_admin_update on public.catalog_products;
drop policy if exists catalog_products_admin_delete on public.catalog_products;

drop table if exists public.catalog_product_images;
drop table if exists public.catalog_product_prices;
drop table if exists public.catalog_product_categories;
drop table if exists public.catalog_categories;
drop table if exists public.catalog_products;
