-- ============================================================
-- UX Store — Row Level Security
--
-- This app is a browser SPA talking straight to Postgres with a
-- publishable key. RLS is therefore the ONLY security boundary —
-- there is no trusted middle tier for anything the client can reach.
-- Default posture: deny everything, then allow narrowly.
--
-- Money-critical rule: `orders.amount_inr` and `orders.status` are
-- never writable by a browser session. Orders are created by the
-- `create-order` Edge Function and marked paid by `payment-webhook`,
-- both using the service role, which bypasses RLS.
-- ============================================================

alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.orders           enable row level security;
alter table public.order_events     enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.store_settings   enable row level security;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create policy "profiles: read own or admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: admin update any"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Privilege escalation guard. An RLS policy cannot express "any column
-- except role", so we do it with column-level grants instead: a normal
-- session simply has no UPDATE privilege on `role`, which means
-- `update profiles set role='admin'` fails before RLS is even consulted.
revoke update on public.profiles from anon, authenticated;
grant  update (full_name, avatar_url, whatsapp) on public.profiles to authenticated;
-- Rows are created by the on_auth_user_created trigger only.
revoke insert, delete on public.profiles from anon, authenticated;

-- ------------------------------------------------------------
-- categories — public catalogue data
-- ------------------------------------------------------------
create policy "categories: public read active"
  on public.categories for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy "categories: admin write"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- products — public catalogue data
-- ------------------------------------------------------------
create policy "products: public read active"
  on public.products for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy "products: admin write"
  on public.products for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------
create policy "orders: read own or admin"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Admins fulfil orders from the UI: change status, leave a note, fix a
-- mistyped buyer contact. Non-admins fail this policy, and nobody at all
-- gets INSERT/DELETE or write access to amount_inr (see grants below).
create policy "orders: admin update"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke insert, update, delete on public.orders from anon, authenticated;
grant  update (status, admin_note, buyer_email, buyer_whatsapp, buyer_name)
  on public.orders to authenticated;

-- ------------------------------------------------------------
-- order_events — the buyer's status timeline
-- ------------------------------------------------------------
create policy "order_events: read own order or admin"
  on public.order_events for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_events.order_id and o.user_id = auth.uid()
    )
  );

-- Written only by the status-change triggers (SECURITY DEFINER, table owner).
revoke insert, update, delete on public.order_events from anon, authenticated;

-- ------------------------------------------------------------
-- payment_attempts — admin only.
-- Raw gateway payloads can contain identifiers we do not want to hand
-- back to the browser, so buyers never read this table at all.
-- ------------------------------------------------------------
create policy "payment_attempts: admin read"
  on public.payment_attempts for select
  to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.payment_attempts from anon, authenticated;

-- ------------------------------------------------------------
-- store_settings
-- ------------------------------------------------------------
create policy "store_settings: public read"
  on public.store_settings for select
  to anon, authenticated
  using (true);

create policy "store_settings: admin update"
  on public.store_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke insert, delete on public.store_settings from anon, authenticated;

-- ------------------------------------------------------------
-- Storage: product images only.
-- This is the one and only bucket. The scripts being sold are NEVER
-- uploaded here — they are delivered by hand over WhatsApp/email.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "product-images: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product-images: admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product-images: admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product-images: admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
