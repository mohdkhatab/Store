-- ============================================================
-- UX Store — fixes for every issue Supabase's security advisor raised
-- ============================================================

-- ------------------------------------------------------------
-- 1. Pin search_path on the two functions that were missing it.
--
-- Without this, a caller who can set `search_path` could shadow a
-- referenced object with their own and have it run with the function
-- owner's privileges. These two are not SECURITY DEFINER, so the risk is
-- lower, but there is no reason to leave the hole open.
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_order_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'UX-' || to_char(now(), 'YYYY') || '-'
                        || lpad(nextval('public.order_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 2. Trigger functions were reachable as RPCs.
--
-- PostgREST exposes every function in `public`, so `handle_new_user`,
-- `log_order_created` and `log_order_status_change` were callable at
-- /rest/v1/rpc/... by anonymous visitors. They are SECURITY DEFINER, so
-- that is not something to leave to chance even though calling a trigger
-- function outside a trigger fails.
--
-- Triggers still fire normally: EXECUTE is checked when the trigger is
-- created, not each time it runs.
-- ------------------------------------------------------------
revoke execute on function public.handle_new_user()          from anon, authenticated, public;
revoke execute on function public.log_order_created()        from anon, authenticated, public;
revoke execute on function public.log_order_status_change()  from anon, authenticated, public;
revoke execute on function public.guard_order_transition()   from anon, authenticated, public;
revoke execute on function public.touch_updated_at()         from anon, authenticated, public;
revoke execute on function public.set_order_number()         from anon, authenticated, public;

-- ------------------------------------------------------------
-- 3. is_admin() should not be reachable by anonymous visitors.
--
-- It could not previously be revoked, because the catalogue policies
-- called it for the `anon` role too — revoking EXECUTE would have made
-- every logged-out product query fail with "permission denied".
--
-- Split the policies by role instead: anonymous visitors get a policy
-- that only checks `is_active` and never calls the function at all.
-- ------------------------------------------------------------
drop policy "categories: public read active" on public.categories;
drop policy "products: public read active"   on public.products;

create policy "categories: anon read active"
  on public.categories for select to anon
  using (is_active);

create policy "categories: auth read active or admin"
  on public.categories for select to authenticated
  using (is_active or (select public.is_admin()));

create policy "products: anon read active"
  on public.products for select to anon
  using (is_active);

create policy "products: auth read active or admin"
  on public.products for select to authenticated
  using (is_active or (select public.is_admin()));

revoke execute on function public.is_admin() from anon, public;
grant  execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------
-- 4. The public bucket let anyone enumerate its contents.
--
-- A `public` bucket serves objects through /storage/v1/object/public/...
-- which bypasses RLS entirely — so images load with no SELECT policy at
-- all. The broad SELECT policy added nothing except the ability to LIST
-- every file in the bucket. Drop it.
-- ------------------------------------------------------------
drop policy "product-images: public read" on storage.objects;

-- Admins still need to list objects to manage the media library.
create policy "product-images: admin list"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- ------------------------------------------------------------
-- Deliberately NOT changed
--
-- * `webhook_events` has RLS on and zero policies. The advisor reports
--   that as INFO; here it is the intent — the table is service-role only.
--
-- * `bump_product_view` stays executable by `anon`. Counting views from
--   logged-out visitors is the entire point, and the worst a caller can
--   do is inflate a vanity counter on an already-public product. It
--   cannot read anything and cannot touch any other column.
-- ------------------------------------------------------------
