-- Commerce foundation: reviewable and reversible.
-- Apply to the isolated Supabase test project first. Do not treat catalog snapshots as inventory.

create table if not exists public.store_inventory (
  product_id text primary key references public.catalog_products(id) on delete restrict,
  quantity_available integer,
  quantity_reserved integer not null default 0,
  low_stock_threshold integer,
  inventory_status text not null default 'unknown',
  source text not null default 'not_provided',
  updated_at timestamptz not null default now(),
  constraint store_inventory_quantity_check check (quantity_available is null or quantity_available >= 0),
  constraint store_inventory_reserved_check check (quantity_reserved >= 0),
  constraint store_inventory_threshold_check check (low_stock_threshold is null or low_stock_threshold >= 0),
  constraint store_inventory_status_check check (inventory_status in ('unknown','tracked','paused')),
  constraint store_inventory_source_check check (source <> '')
);

create table if not exists public.store_inventory_movements (
  id bigint generated always as identity primary key,
  product_id text not null references public.catalog_products(id) on delete restrict,
  delta integer not null,
  reason text not null,
  reference_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint store_inventory_movement_reason_check check (reason in ('opening_balance','sale_reservation','sale_release','restock','adjustment','damaged','correction'))
);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending_payment',
  currency text not null default 'SAR',
  subtotal numeric(12,2) not null,
  discount_total numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  idempotency_key text not null unique,
  payment_status text not null default 'unpaid',
  shipping_status text not null default 'unfulfilled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_orders_status_check check (status in ('pending_payment','paid','processing','shipped','delivered','cancelled','refunded')),
  constraint store_orders_payment_check check (payment_status in ('unpaid','pending','paid','failed','refunded')),
  constraint store_orders_shipping_check check (shipping_status in ('unfulfilled','ready','shipped','delivered','returned')),
  constraint store_orders_amounts_check check (subtotal >= 0 and discount_total >= 0 and shipping_total >= 0 and total >= 0)
);

create table if not exists public.store_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id text not null references public.catalog_products(id) on delete restrict,
  product_name text not null,
  unit_price numeric(12,2) not null,
  quantity integer not null,
  line_total numeric(12,2) not null,
  currency text not null default 'SAR',
  created_at timestamptz not null default now(),
  constraint store_order_items_quantity_check check (quantity > 0),
  constraint store_order_items_amount_check check (unit_price >= 0 and line_total >= 0)
);

create table if not exists public.store_order_addresses (
  id bigint generated always as identity primary key,
  order_id uuid not null unique references public.store_orders(id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  city text not null,
  address_line text not null,
  postal_code text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.store_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.store_orders(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.store_payment_events (
  id bigint generated always as identity primary key,
  order_id uuid references public.store_orders(id) on delete set null,
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.store_promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  discount_type text not null,
  discount_value numeric(12,2) not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_promotions_type_check check (discount_type in ('percent','fixed')),
  constraint store_promotions_value_check check (discount_value >= 0),
  constraint store_promotions_window_check check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists store_inventory_alert_idx on public.store_inventory (inventory_status, quantity_available, low_stock_threshold);
create index if not exists store_inventory_movements_product_idx on public.store_inventory_movements (product_id, created_at desc);
create index if not exists store_orders_customer_idx on public.store_orders (customer_id, created_at desc);
create index if not exists store_orders_status_idx on public.store_orders (status, created_at desc);
create index if not exists store_order_items_order_idx on public.store_order_items (order_id);
create index if not exists store_order_events_order_idx on public.store_order_events (order_id, created_at desc);

revoke all on table public.store_inventory, public.store_inventory_movements, public.store_orders, public.store_order_items, public.store_order_addresses, public.store_order_events, public.store_payment_events, public.store_promotions, public.store_settings from anon, authenticated;
grant select on table public.store_orders, public.store_order_items, public.store_order_addresses, public.store_order_events to authenticated;
grant usage, select on sequence
  public.store_inventory_movements_id_seq,
  public.store_order_items_id_seq,
  public.store_order_addresses_id_seq,
  public.store_order_events_id_seq,
  public.store_payment_events_id_seq
to authenticated;

alter table public.store_inventory enable row level security;
alter table public.store_inventory_movements enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.store_order_addresses enable row level security;
alter table public.store_order_events enable row level security;
alter table public.store_payment_events enable row level security;
alter table public.store_promotions enable row level security;
alter table public.store_settings enable row level security;

create policy store_inventory_admin_all on public.store_inventory for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy store_inventory_movements_admin_all on public.store_inventory_movements for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy store_orders_owner_read on public.store_orders for select to authenticated using (customer_id = (select auth.uid()) or (select private.is_admin()));
create policy store_orders_admin_write on public.store_orders for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy store_order_items_owner_read on public.store_order_items for select to authenticated using (exists (select 1 from public.store_orders o where o.id = order_id and (o.customer_id = (select auth.uid()) or (select private.is_admin()))));
create policy store_order_addresses_owner_read on public.store_order_addresses for select to authenticated using (exists (select 1 from public.store_orders o where o.id = order_id and (o.customer_id = (select auth.uid()) or (select private.is_admin()))));
create policy store_order_events_owner_read on public.store_order_events for select to authenticated using (exists (select 1 from public.store_orders o where o.id = order_id and (o.customer_id = (select auth.uid()) or (select private.is_admin()))));
create policy store_payment_events_admin_all on public.store_payment_events for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy store_promotions_admin_all on public.store_promotions for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy store_settings_admin_all on public.store_settings for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Creates orders only when exact current catalog prices and verified tracked inventory exist.
-- Unknown inventory deliberately rejects checkout instead of inventing availability.
create or replace function public.store_create_order(
  p_idempotency_key text,
  p_items jsonb,
  p_recipient_name text,
  p_phone text,
  p_city text,
  p_address_line text,
  p_postal_code text default null,
  p_notes text default null
) returns table(order_id uuid, order_number text, status text, total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid := auth.uid();
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_item jsonb;
  v_product_id text;
  v_quantity integer;
  v_product_name text;
  v_price numeric(12,2);
  v_available boolean;
  v_out boolean;
  v_inventory store_inventory%rowtype;
  v_line numeric(12,2);
begin
  if v_customer is null then raise exception 'authentication_required'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then raise exception 'invalid_idempotency_key'; end if;
  select id, order_number, store_orders.status, total into v_order_id, v_order_number, status, total from store_orders where idempotency_key = p_idempotency_key;
  if v_order_id is not null then order_id := v_order_id; return next; return; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'items_required'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := v_item->>'product_id';
    v_quantity := (v_item->>'quantity')::integer;
    if v_product_id is null or v_quantity is null or v_quantity <= 0 or v_quantity > 99 then raise exception 'invalid_item'; end if;
    select name, available, out_of_stock into v_product_name, v_available, v_out from catalog_products where id = v_product_id;
    if not found or not v_available or v_out then raise exception 'product_unavailable:%', v_product_id; end if;
    select price into v_price from catalog_product_prices where product_id = v_product_id and is_current order by observed_at desc limit 1;
    if v_price is null then raise exception 'price_unavailable:%', v_product_id; end if;
    select * into v_inventory from store_inventory where product_id = v_product_id for update;
    if not found or v_inventory.inventory_status <> 'tracked' or v_inventory.quantity_available is null then raise exception 'inventory_unconfirmed:%', v_product_id; end if;
    if v_inventory.quantity_available - v_inventory.quantity_reserved < v_quantity then raise exception 'insufficient_inventory:%', v_product_id; end if;
    v_line := v_price * v_quantity;
    v_subtotal := v_subtotal + v_line;
  end loop;
  v_order_number := 'BADER-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into store_orders(customer_id, order_number, subtotal, total, idempotency_key) values (v_customer, v_order_number, v_subtotal, v_subtotal, p_idempotency_key) returning id into v_order_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := v_item->>'product_id'; v_quantity := (v_item->>'quantity')::integer;
    select name into v_product_name from catalog_products where id=v_product_id;
    select price into v_price from catalog_product_prices where product_id=v_product_id and is_current order by observed_at desc limit 1;
    insert into store_order_items(order_id, product_id, product_name, unit_price, quantity, line_total) values (v_order_id, v_product_id, v_product_name, v_price, v_quantity, v_price*v_quantity);
    update store_inventory set quantity_reserved=quantity_reserved+v_quantity, updated_at=now() where product_id=v_product_id;
  end loop;
  insert into store_order_addresses(order_id, recipient_name, phone, city, address_line, postal_code, notes) values (v_order_id, p_recipient_name, p_phone, p_city, p_address_line, p_postal_code, p_notes);
  insert into store_order_events(order_id, event_type, to_status, actor_id) values (v_order_id, 'created', 'pending_payment', v_customer);
  return query select v_order_id, v_order_number, 'pending_payment'::text, v_subtotal;
end;
$$;

revoke all on function public.store_create_order(text, jsonb, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.store_create_order(text, jsonb, text, text, text, text, text, text) to authenticated;

comment on table public.store_inventory is 'Live inventory only when inventory_status=tracked; null quantity means unknown and blocks checkout.';
comment on table public.store_orders is 'Commerce orders; payment remains pending until a verified provider webhook updates it.';
comment on function public.store_create_order(text, jsonb, text, text, text, text, text, text) is 'Server-side price and inventory validation with idempotency; rejects unknown inventory.';
