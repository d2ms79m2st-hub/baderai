-- Manual rollback for 20261025001000_create_catalog_tables.sql.
-- Review carefully before use. This file has not been executed.
-- WARNING: running this rollback deletes all catalog data in these five tables.
-- It does not restore rows or undo imports. Take a backup before using it.

drop table if exists public.catalog_product_images;
drop table if exists public.catalog_product_prices;
drop table if exists public.catalog_product_categories;
drop table if exists public.catalog_categories;
drop table if exists public.catalog_products;
