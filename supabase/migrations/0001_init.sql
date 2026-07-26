-- ============================================================
-- UX Store — core schema
-- ============================================================

-- ---------- enums ----------
create type public.user_role     as enum ('user', 'admin');
create type public.order_status  as enum ('pending_payment', 'paid', 'delivered', 'failed', 'cancelled', 'refunded');
create type public.payment_status as enum ('created', 'success', 'failed');
create type public.event_actor   as enum ('system', 'webhook', 'admin', 'customer');

-- ---------- shared trigger: updated_at ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  avatar_url  text,
  whatsapp    text,
  role        public.user_role not null default 'user',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a profile row whenever an auth user signs up (email or OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check. SECURITY DEFINER so it reads profiles WITHOUT triggering
-- the RLS policies that themselves call this function — otherwise every
-- admin policy would recurse infinitely.
-- search_path is pinned so a caller cannot shadow `profiles` with their own table.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- categories ----------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  icon        text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger categories_touch_updated_at
  before update on public.categories
  for each row execute function public.touch_updated_at();

create index categories_active_sort_idx on public.categories (is_active, sort_order);

-- ---------- products ----------
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique,
  short_description text,
  description       text,                                  -- markdown
  price_inr         numeric(10, 2) not null check (price_inr >= 0),
  compare_at_price  numeric(10, 2) check (compare_at_price is null or compare_at_price >= price_inr),
  category_id       uuid references public.categories (id) on delete set null,
  cover_image_url   text,
  gallery_urls      text[] not null default '{}',
  tech_stack        text[] not null default '{}',
  features          text[] not null default '{}',
  demo_url          text,
  version           text,
  is_active         boolean not null default true,
  is_featured       boolean not null default false,
  sales_count       integer not null default 0,
  view_count        integer not null default 0,
  rating            numeric(2, 1),                          -- phase 2: reviews
  review_count      integer not null default 0,             -- phase 2: reviews
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

create index products_active_created_idx  on public.products (is_active, created_at desc);
create index products_category_idx        on public.products (category_id);
create index products_featured_idx        on public.products (is_featured) where is_featured;
-- trigram-free search: cheap and good enough for a small catalogue
create index products_title_search_idx    on public.products using gin (to_tsvector('simple', title || ' ' || coalesce(short_description, '')));

-- ---------- orders ----------
-- One order == one product. No cart in phase 1.
create sequence public.order_number_seq start 1;

create table public.orders (
  id                     uuid primary key default gen_random_uuid(),
  order_number           text not null unique,
  user_id                uuid not null references auth.users (id) on delete restrict,
  product_id             uuid references public.products (id) on delete set null,

  -- Snapshots: the product may be renamed or repriced later, but the order
  -- record must keep saying what was actually sold and for how much.
  product_title_snapshot text not null,
  product_slug_snapshot  text,
  amount_inr             numeric(10, 2) not null check (amount_inr >= 0),
  discount_inr           numeric(10, 2) not null default 0 check (discount_inr >= 0),  -- phase 2: coupons

  status                 public.order_status not null default 'pending_payment',

  -- Where the script gets delivered. This IS the product for the buyer.
  buyer_email            text not null,
  buyer_whatsapp         text not null,
  buyer_name             text,
  buyer_note             text,

  gateway_provider       text,
  gateway_ref            text,

  admin_note             text,
  paid_at                timestamptz,
  delivered_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index orders_user_created_idx   on public.orders (user_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
-- A gateway reference must never map to two different orders.
create unique index orders_gateway_ref_uniq
  on public.orders (gateway_provider, gateway_ref)
  where gateway_ref is not null;

create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- Human-readable order number: UX-2026-0001
create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'UX-' || to_char(now(), 'YYYY') || '-'
                        || lpad(nextval('public.order_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger orders_set_order_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- ---------- order_events (audit trail) ----------
create table public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status   public.order_status not null,
  actor       public.event_actor not null default 'system',
  actor_id    uuid,
  note        text,
  created_at  timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

-- Status transitions are logged by a trigger, not by application code, so
-- there is no code path that can change a status without leaving a trace.
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    -- keep the timestamp columns honest regardless of who did the update
    if new.status = 'paid' and new.paid_at is null then
      new.paid_at := now();
    end if;
    if new.status = 'delivered' and new.delivered_at is null then
      new.delivered_at := now();
    end if;

    insert into public.order_events (order_id, from_status, to_status, actor, actor_id)
    values (
      new.id,
      old.status,
      new.status,
      case when auth.uid() is null then 'webhook'::public.event_actor
           else 'admin'::public.event_actor end,
      auth.uid()
    );

    -- bump lifetime sales when money actually lands
    if new.status = 'paid' and old.status <> 'paid' and new.product_id is not null then
      update public.products set sales_count = sales_count + 1 where id = new.product_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_log_status_change
  before update on public.orders
  for each row execute function public.log_order_status_change();

-- Log the initial state too, so the timeline starts at order creation.
create or replace function public.log_order_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.order_events (order_id, from_status, to_status, actor, actor_id)
  values (new.id, null, new.status, 'customer', new.user_id);
  return new;
end;
$$;

create trigger orders_log_created
  after insert on public.orders
  for each row execute function public.log_order_created();

-- ---------- payment_attempts (append-only payment log) ----------
create table public.payment_attempts (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  gateway_provider text not null,
  gateway_ref      text,
  status           public.payment_status not null default 'created',
  amount_inr       numeric(10, 2),
  raw_request      jsonb,
  raw_response     jsonb,
  error_message    text,
  created_at       timestamptz not null default now()
);

create index payment_attempts_order_idx on public.payment_attempts (order_id, created_at desc);
create index payment_attempts_ref_idx   on public.payment_attempts (gateway_provider, gateway_ref);

-- ---------- store_settings (single row) ----------
create table public.store_settings (
  id                uuid primary key default gen_random_uuid(),
  singleton         boolean not null default true unique check (singleton),
  store_name        text not null default 'UX Store',
  whatsapp_number   text,
  support_email     text,
  announcement_text text,
  hero_headline     text,
  hero_subheadline  text,
  is_store_open     boolean not null default true,
  updated_at        timestamptz not null default now()
);

create trigger store_settings_touch_updated_at
  before update on public.store_settings
  for each row execute function public.touch_updated_at();

insert into public.store_settings (store_name, whatsapp_number, support_email, hero_headline, hero_subheadline)
values (
  'UX Store',
  '910000000000',
  'support@example.com',
  'Production-ready scripts, delivered personally.',
  'Hand-built source code for real projects. Pay online, get your files on WhatsApp or email within hours.'
);
