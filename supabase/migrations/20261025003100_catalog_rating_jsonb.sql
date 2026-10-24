-- Follow-up migration: the official source sends rating as null or an object.
-- This preserves the source JSON instead of coercing it to a number.

alter table public.catalog_products
  drop constraint if exists catalog_products_rating_check;

alter table public.catalog_products
  alter column rating type jsonb
  using case when rating is null then null else to_jsonb(rating) end;

alter table public.catalog_products
  add constraint catalog_products_rating_check
  check (rating is null or jsonb_typeof(rating) = 'object');
