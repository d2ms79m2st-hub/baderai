-- Rollback for 20261025020000_create_commerce_foundation.sql.
-- This intentionally deletes commerce data in these tables. It does not touch catalog tables.

drop function if exists public.store_create_order(text, jsonb, text, text, text, text, text, text);

drop table if exists public.store_settings;
drop table if exists public.store_promotions;
drop table if exists public.store_payment_events;
drop table if exists public.store_order_events;
drop table if exists public.store_order_addresses;
drop table if exists public.store_order_items;
drop table if exists public.store_orders;
drop table if exists public.store_inventory_movements;
drop table if exists public.store_inventory;
