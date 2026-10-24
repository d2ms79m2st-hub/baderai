-- Review-only migration for the catalog phase.
-- This file has not been applied to baderai-auth.
-- It assumes the existing private.is_admin() function from the auth migrations.

create table if not exists public.catalog_products (
  id text primary key,
  sku text,
  name text not null,
  description text,
  official_url text not null,
  status text,
  currency text not null default 'SAR',
  weight text,
  has_options boolean not null default false,
  rating numeric(4,2),
  available boolean not null default false,
  out_of_stock boolean not null default false,
  source_store_id text not null,
  source_collected_at timestamptz not null,
  source_updated_at timestamptz,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_products_availability_check check (not (available and out_of_stock)),
  constraint catalog_products_rating_check check (rating is null or (rating >= 0 and rating <= 5)),
  constraint catalog_products_currency_check check (currency <> '')
);

create table if not exists public.catalog_categories (
  id text primary key,
  name text not null,
  source_store_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_categories_name_check check (name <> '')
);

create table if not exists public.catalog_product_categories (
  product_id text not null references public.catalog_products(id) on delete cascade,
  category_id text not null references public.catalog_categories(id) on delete restrict,
  observed_at timestamptz not null,
  primary key (product_id, category_id)
);

create table if not exists public.catalog_product_prices (
  id bigint generated always as identity primary key,
  product_id text not null references public.catalog_products(id) on delete cascade,
  price numeric(12,2),
  regular_price numeric(12,2),
  sale_price numeric(12,2),
  currency text not null,
  observed_at timestamptz not null,
  source text not null default 'salla_public_catalog_snapshot',
  is_current boolean not null default true,
  constraint catalog_product_prices_nonnegative check (
    (price is null or price >= 0) and
    (regular_price is null or regular_price >= 0) and
    (sale_price is null or sale_price >= 0)
  ),
  constraint catalog_product_prices_snapshot_unique unique (product_id, observed_at)
);

create table if not exists public.catalog_product_images (
  id bigint generated always as identity primary key,
  product_id text not null references public.catalog_products(id) on delete cascade,
  url text not null,
  original_url text,
  kind text not null default 'primary',
  sort_order smallint not null default 0,
  is_current boolean not null default true,
  observed_at timestamptz not null,
  constraint catalog_product_images_url_check check (url <> '')
);

create index if not exists catalog_products_public_idx
  on public.catalog_products (available, out_of_stock, updated_at desc);
create index if not exists catalog_product_categories_category_idx
  on public.catalog_product_categories (category_id, product_id);
create index if not exists catalog_product_prices_current_idx
  on public.catalog_product_prices (product_id, is_current, observed_at desc);
create index if not exists catalog_product_images_current_idx
  on public.catalog_product_images (product_id, is_current, sort_order);

-- Make table privileges explicit; RLS remains the authorization boundary.
revoke all on table
  public.catalog_products,
  public.catalog_categories,
  public.catalog_product_categories,
  public.catalog_product_prices,
  public.catalog_product_images
from anon, authenticated;

grant select on table
  public.catalog_products,
  public.catalog_categories,
  public.catalog_product_categories,
  public.catalog_product_prices,
  public.catalog_product_images
to anon, authenticated;

grant insert, update, delete on table
  public.catalog_products,
  public.catalog_categories,
  public.catalog_product_categories,
  public.catalog_product_prices,
  public.catalog_product_images
to authenticated;

revoke all on sequence
  public.catalog_product_prices_id_seq,
  public.catalog_product_images_id_seq
from anon, authenticated;

grant usage, select on sequence
  public.catalog_product_prices_id_seq,
  public.catalog_product_images_id_seq
to authenticated;

alter table public.catalog_products enable row level security;
alter table public.catalog_categories enable row level security;
alter table public.catalog_product_categories enable row level security;
alter table public.catalog_product_prices enable row level security;
alter table public.catalog_product_images enable row level security;

create policy catalog_products_public_read
  on public.catalog_products for select to anon, authenticated
  using (available and not out_of_stock);
create policy catalog_products_admin_read
  on public.catalog_products for select to authenticated
  using ((select private.is_admin()));
create policy catalog_products_admin_insert
  on public.catalog_products for insert to authenticated
  with check ((select private.is_admin()));
create policy catalog_products_admin_update
  on public.catalog_products for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy catalog_products_admin_delete
  on public.catalog_products for delete to authenticated
  using ((select private.is_admin()));

create policy catalog_categories_public_read
  on public.catalog_categories for select to anon, authenticated
  using (exists (
    select 1
    from public.catalog_product_categories pc
    join public.catalog_products p on p.id = pc.product_id
    where pc.category_id = catalog_categories.id
      and p.available and not p.out_of_stock
  ));
create policy catalog_categories_admin_read
  on public.catalog_categories for select to authenticated
  using ((select private.is_admin()));
create policy catalog_categories_admin_insert
  on public.catalog_categories for insert to authenticated
  with check ((select private.is_admin()));
create policy catalog_categories_admin_update
  on public.catalog_categories for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy catalog_categories_admin_delete
  on public.catalog_categories for delete to authenticated
  using ((select private.is_admin()));

create policy catalog_product_categories_public_read
  on public.catalog_product_categories for select to anon, authenticated
  using (exists (
    select 1 from public.catalog_products p
    where p.id = catalog_product_categories.product_id
      and p.available and not p.out_of_stock
  ));
create policy catalog_product_categories_admin_all
  on public.catalog_product_categories for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy catalog_product_prices_public_read
  on public.catalog_product_prices for select to anon, authenticated
  using (is_current and exists (
    select 1 from public.catalog_products p
    where p.id = catalog_product_prices.product_id
      and p.available and not p.out_of_stock
  ));
create policy catalog_product_prices_admin_all
  on public.catalog_product_prices for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy catalog_product_images_public_read
  on public.catalog_product_images for select to anon, authenticated
  using (is_current and exists (
    select 1 from public.catalog_products p
    where p.id = catalog_product_images.product_id
      and p.available and not p.out_of_stock
  ));
create policy catalog_product_images_admin_all
  on public.catalog_product_images for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

comment on table public.catalog_products is 'Snapshot catalog only; availability is not live inventory.';
comment on column public.catalog_products.source_payload is 'Normalized source payload retained to prevent data loss during migration.';
comment on table public.catalog_product_prices is 'Observed price snapshots, not checkout pricing authority.';
