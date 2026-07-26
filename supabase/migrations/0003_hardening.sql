-- ============================================================
-- UX Store — hardening pass
--
-- Four additions, each closing a hole the base schema left open:
--   1. Illegal order status transitions rejected by the DB itself.
--   2. webhook_events: replay/idempotency shield for the payment webhook.
--   3. One live pending order per user+product (retry-safe, spam-resistant).
--   4. wa.me-compatible phone format enforced at the column level.
-- Plus: every policy re-created with the (select ...) wrapper so
-- auth.uid()/is_admin() evaluate once per query instead of once per row.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Order status machine, enforced in Postgres
--
-- Application code is not the right place for this: the webhook, the
-- admin UI and any future script all mutate orders, and each would need
-- its own copy of the rules. One trigger covers every path.
-- ------------------------------------------------------------
create or replace function public.guard_order_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
       (old.status = 'pending_payment' and new.status in ('paid', 'failed', 'cancelled'))
    or (old.status = 'failed'          and new.status in ('pending_payment', 'paid', 'cancelled'))
    or (old.status = 'cancelled'       and new.status in ('pending_payment'))
    or (old.status = 'paid'            and new.status in ('delivered', 'refunded'))
    or (old.status = 'delivered'       and new.status in ('refunded'))
  ) then
    raise exception 'illegal order transition: % -> %', old.status, new.status
      using errcode = '22023';
  end if;

  return new;
end;
$$;

-- Must run before log_order_status_change so a rejected transition
-- never reaches the audit log.
create trigger orders_guard_transition
  before update of status on public.orders
  for each row execute function public.guard_order_transition();

-- ------------------------------------------------------------
-- 2. webhook_events — insert first, then process
--
-- The unique (gateway_provider, event_id) constraint is the idempotency
-- mechanism: a replayed webhook fails the insert, and the function
-- returns 200 without touching the order a second time. Gateways retry
-- aggressively, so this is not optional.
-- ------------------------------------------------------------
create type public.webhook_state as enum ('received', 'processed', 'ignored', 'invalid', 'error');

create table public.webhook_events (
  id               uuid primary key default gen_random_uuid(),
  gateway_provider text not null,
  -- provider's own event id when it sends one, else sha256 of the raw body
  event_id         text not null,
  event_type       text,
  gateway_ref      text,
  order_id         uuid references public.orders (id) on delete set null,
  state            public.webhook_state not null default 'received',
  signature_ok     boolean,
  headers          jsonb,
  raw_body         text not null,
  error_message    text,
  received_at      timestamptz not null default now(),
  processed_at     timestamptz,
  unique (gateway_provider, event_id)
);

create index webhook_events_state_idx on public.webhook_events (state, received_at desc);
create index webhook_events_order_idx on public.webhook_events (order_id);

alter table public.webhook_events enable row level security;
-- No policies and no grants: service role only. FORCE so that even a
-- future table-owner code path cannot read it without meaning to.
alter table public.webhook_events force row level security;
revoke all on public.webhook_events from anon, authenticated;

-- ------------------------------------------------------------
-- 3. Pending order dedup + expiry
--
-- Without this, clicking "Buy" five times creates five pending orders
-- and five gateway sessions for one purchase. create-order catches the
-- unique violation (23505) and refreshes the existing pending order.
-- ------------------------------------------------------------
alter table public.orders
  add column expires_at timestamptz not null default now() + interval '45 minutes';

create unique index orders_one_pending_per_product_idx
  on public.orders (user_id, product_id)
  where status = 'pending_payment';

create index orders_expiry_idx
  on public.orders (expires_at)
  where status = 'pending_payment';

-- ------------------------------------------------------------
-- 4. Phone format
--
-- wa.me requires E.164 WITHOUT the leading '+'. A stored "+91 98765 43210"
-- silently produces a dead delivery link, which is the one link in this
-- whole app that absolutely must work.
-- ------------------------------------------------------------
alter table public.orders
  add constraint orders_buyer_whatsapp_e164
  check (buyer_whatsapp ~ '^[1-9][0-9]{7,14}$');

alter table public.profiles
  add constraint profiles_whatsapp_e164
  check (whatsapp is null or whatsapp ~ '^[1-9][0-9]{7,14}$');

alter table public.store_settings
  add constraint store_settings_whatsapp_e164
  check (whatsapp_number is null or whatsapp_number ~ '^[1-9][0-9]{7,14}$');

-- ------------------------------------------------------------
-- 5. Policy performance: wrap volatile-looking calls in a subquery.
--
-- `using (user_id = auth.uid())` re-invokes auth.uid() for every candidate
-- row. `using (user_id = (select auth.uid()))` makes Postgres hoist it to
-- an InitPlan evaluated once per statement. Same semantics, dramatically
-- better plans as tables grow — this is the documented Supabase guidance.
-- ------------------------------------------------------------
drop policy "profiles: read own or admin"          on public.profiles;
drop policy "profiles: update own"                 on public.profiles;
drop policy "profiles: admin update any"           on public.profiles;
drop policy "categories: public read active"       on public.categories;
drop policy "categories: admin write"              on public.categories;
drop policy "products: public read active"         on public.products;
drop policy "products: admin write"                on public.products;
drop policy "orders: read own or admin"            on public.orders;
drop policy "orders: admin update"                 on public.orders;
drop policy "order_events: read own order or admin" on public.order_events;
drop policy "payment_attempts: admin read"         on public.payment_attempts;
drop policy "store_settings: admin update"         on public.store_settings;

create policy "profiles: read own or admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles: admin update any"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "categories: public read active"
  on public.categories for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "categories: admin write"
  on public.categories for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "products: public read active"
  on public.products for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "products: admin write"
  on public.products for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "orders: read own or admin"
  on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "orders: admin update"
  on public.orders for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- SECURITY DEFINER so the child-table policy does not re-run the parent
-- table's own RLS (double cost, and a recursion risk once orders policies
-- ever reference order_events). Returns only a boolean about the caller's
-- own data, so exposing it over the API leaks nothing.
create or replace function public.owns_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.user_id = auth.uid()
  );
$$;

revoke execute on function public.owns_order(uuid) from anon, public;
grant  execute on function public.owns_order(uuid) to authenticated;

create policy "order_events: read own order or admin"
  on public.order_events for select to authenticated
  using ((select public.is_admin()) or (select public.owns_order(order_events.order_id)));

create policy "payment_attempts: admin read"
  on public.payment_attempts for select to authenticated
  using ((select public.is_admin()));

create policy "store_settings: admin update"
  on public.store_settings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Storage policies get the same treatment.
drop policy "product-images: admin insert" on storage.objects;
drop policy "product-images: admin update" on storage.objects;
drop policy "product-images: admin delete" on storage.objects;

create policy "product-images: admin insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "product-images: admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "product-images: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- ------------------------------------------------------------
-- 6. view_count bump without granting UPDATE on products.
--
-- Giving buyers any UPDATE privilege on products is how a column-grant
-- mistake turns into "buyer edits price". An RPC keeps the grant at zero.
-- ------------------------------------------------------------
create or replace function public.bump_product_view(p_product_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products
     set view_count = view_count + 1
   where id = p_product_id and is_active;
$$;

grant execute on function public.bump_product_view(uuid) to anon, authenticated;

-- Fix the store_settings placeholder to satisfy the new E.164 constraint.
update public.store_settings set whatsapp_number = '910000000000';
