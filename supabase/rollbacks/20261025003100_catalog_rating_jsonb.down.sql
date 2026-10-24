-- Lossless-only rollback for 20261025003100_catalog_rating_jsonb.sql.
-- It refuses to run when object ratings exist because converting them to numeric
-- would discard source fields such as count.

do $$
begin
  if exists (
    select 1 from public.catalog_products
    where rating is not null and jsonb_typeof(rating) <> 'number'
    limit 1
  ) then
    raise exception 'refusing lossy rating rollback: object ratings exist';
  end if;
end;
$$;

alter table public.catalog_products
  drop constraint if exists catalog_products_rating_check;

alter table public.catalog_products
  alter column rating type numeric(4,2)
  using case when rating is null then null else (rating #>> '{}')::numeric end;

alter table public.catalog_products
  add constraint catalog_products_rating_check
  check (rating is null or (rating >= 0 and rating <= 5));
