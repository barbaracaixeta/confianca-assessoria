-- =====================================================================
-- Confiança Assessoria Acadêmica — schema principal
-- Valores monetários em centavos (integer) para evitar erro de ponto flutuante.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.app_role as enum ('customer', 'operator', 'admin', 'super_admin');

create type public.discount_type as enum ('none', 'percent', 'fixed', 'sale_price');

create type public.pricing_unit as enum ('fixed', 'per_page');

create type public.coupon_type as enum ('percent', 'fixed');

create type public.order_status as enum (
  'awaiting_payment',
  'payment_confirmed',
  'awaiting_files',
  'in_analysis',
  'in_production',
  'in_review',
  'awaiting_approval',
  'delivered',
  'completed',
  'cancelled'
);

create type public.payment_status as enum (
  'pending',
  'confirmed',
  'received',
  'overdue',
  'refused',
  'refunded',
  'cancelled'
);

create type public.payment_method as enum ('pix', 'credit_card');

create type public.file_kind as enum ('customer_upload', 'delivery', 'product_image', 'site_asset');

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Perfis e papéis
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email citext not null,
  phone text,
  cpf_cnpj text,
  role public.app_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role) where role <> 'customer';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Papel do usuário atual (security definer evita recursão nas policies de profiles)
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() and is_active),
    'customer'::public.app_role
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('operator', 'admin', 'super_admin');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'super_admin');
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'super_admin';
$$;

-- Impede que um usuário altere o próprio papel (somente super admin altera papéis)
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active
      or new.email is distinct from old.email)
     and auth.uid() is not null
     and not public.is_super_admin() then
    raise exception 'Somente SUPER_ADMIN pode alterar papel, status ou e-mail do perfil';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------------
-- Clientes (permite checkout de visitante e vínculo posterior à conta)
-- ---------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  email citext not null unique,
  phone text,
  cpf_cnpj text,
  asaas_customer_id text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_profile_idx on public.customers (profile_id);

create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- Cria o perfil ao cadastrar e vincula pedidos de visitante somente com e-mail confirmado
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.link_customer_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null then
    update public.customers
       set profile_id = new.id
     where email = new.email::citext
       and profile_id is null;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_confirmed after insert or update of email_confirmed_at on auth.users
  for each row execute function public.link_customer_on_confirm();

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null default '',
  description text not null default '',
  -- Preço
  pricing_unit public.pricing_unit not null default 'fixed',
  base_price_cents integer not null check (base_price_cents >= 0),
  discount_type public.discount_type not null default 'none',
  discount_value integer not null default 0 check (discount_value >= 0),
  promo_starts_at timestamptz,
  promo_ends_at timestamptz,
  min_quantity integer not null default 1 check (min_quantity >= 1),
  max_quantity integer check (max_quantity is null or max_quantity >= min_quantity),
  min_price_cents integer check (min_price_cents is null or min_price_cents >= 0),
  max_price_cents integer check (max_price_cents is null or max_price_cents >= 0),
  -- Entrega e conteúdo
  delivery_days integer not null default 3 check (delivery_days >= 0),
  delivery_label text,
  benefits jsonb not null default '[]'::jsonb,
  audience jsonb not null default '[]'::jsonb,
  includes jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  image_path text,
  -- Exibição
  is_active boolean not null default false,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_percent_range check (discount_type <> 'percent' or discount_value between 0 and 100),
  constraint products_sale_below_base check (discount_type <> 'sale_price' or discount_value <= base_price_cents),
  constraint products_promo_window check (promo_starts_at is null or promo_ends_at is null or promo_starts_at < promo_ends_at),
  constraint products_price_bounds check (min_price_cents is null or max_price_cents is null or min_price_cents <= max_price_cents)
);

create index products_category_idx on public.products (category_id);
create index products_active_sort_idx on public.products (is_active, sort_order);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null,
  alt text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

-- Faixas de preço por quantidade (ex.: páginas). Substitui o preço base a partir de min_quantity.
create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  min_quantity integer not null check (min_quantity >= 1),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, min_quantity)
);

-- ---------------------------------------------------------------------
-- Promoções e cupons
-- ---------------------------------------------------------------------
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  banner_path text,
  discount_type public.coupon_type not null,
  discount_value integer not null check (discount_value > 0),
  coupon_code citext,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  applies_to_all boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (discount_type <> 'percent' or discount_value <= 100)
);

create trigger promotions_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();

create table public.promotion_products (
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  primary key (promotion_id, product_id)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code citext not null unique check (code ~ '^[A-Za-z0-9_-]{3,32}$'),
  description text,
  type public.coupon_type not null,
  value integer not null check (value > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer check (per_customer_limit is null or per_customer_limit > 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  applies_to_all boolean not null default true,
  first_order_only boolean not null default false,
  is_active boolean not null default true,
  promotion_id uuid references public.promotions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'percent' or value <= 100),
  check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create trigger coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

create table public.coupon_products (
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  primary key (coupon_id, product_id)
);

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
create sequence public.order_number_seq start with 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('CF-' || lpad(nextval('public.order_number_seq')::text, 7, '0')),
  customer_id uuid not null references public.customers (id) on delete restrict,
  status public.order_status not null default 'awaiting_payment',
  payment_status public.payment_status not null default 'pending',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  coupon_id uuid references public.coupons (id) on delete set null,
  coupon_code citext,
  -- Token não adivinhável para o cliente visitante acompanhar o pedido
  access_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  customer_notes text,
  assignee_id uuid references public.profiles (id) on delete set null,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = subtotal_cents - discount_cents)
);

create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  product_slug text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  list_price_cents integer not null check (list_price_cents >= 0),
  quantity integer not null check (quantity >= 1),
  total_cents integer not null check (total_cents >= 0),
  delivery_days integer not null default 0,
  details jsonb not null default '{}'::jsonb
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create or replace function public.track_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger orders_track_status after insert or update of status on public.orders
  for each row execute function public.track_order_status();

create table public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  discount_cents integer not null check (discount_cents >= 0),
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index coupon_usages_coupon_idx on public.coupon_usages (coupon_id) where released_at is null;
create index coupon_usages_customer_idx on public.coupon_usages (coupon_id, customer_id) where released_at is null;

-- ---------------------------------------------------------------------
-- Pagamentos
-- ---------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'asaas',
  provider_payment_id text unique,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount_cents integer not null check (amount_cents >= 0),
  installments integer not null default 1 check (installments between 1 and 12),
  -- Pix: payload copia-e-cola (o QR em imagem é gerado/consultado sob demanda)
  pix_payload text,
  pix_expires_at timestamptz,
  invoice_url text,
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  card_brand text,
  failure_reason text,
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id, created_at desc);

create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- Eventos brutos do webhook — a unicidade do id garante idempotência
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'asaas',
  provider_event_id text not null,
  event text not null,
  provider_payment_id text,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index payment_events_payment_idx on public.payment_events (provider_payment_id);

-- ---------------------------------------------------------------------
-- Arquivos e mensagens
-- ---------------------------------------------------------------------
create table public.files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  kind public.file_kind not null,
  customer_id uuid references public.customers (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create index files_customer_idx on public.files (customer_id, created_at desc);

create table public.order_files (
  order_id uuid not null references public.orders (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  primary key (order_id, file_id)
);

create index order_files_file_idx on public.order_files (file_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  is_staff boolean not null default false,
  body text not null check (char_length(body) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_order_idx on public.messages (order_id, created_at);

-- ---------------------------------------------------------------------
-- Conteúdo
-- ---------------------------------------------------------------------
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_path text,
  cta_label text,
  cta_href text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger banners_updated_at before update on public.banners
  for each row execute function public.set_updated_at();

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'geral',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_detail text,
  photo_path text,
  body text not null,
  product_id uuid references public.products (id) on delete set null,
  rating smallint check (rating between 1 and 5),
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger testimonials_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email', 'in_app')),
  template text not null,
  recipient text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_status_idx on public.notifications (status, created_at);

-- Carrinho persistente do usuário autenticado
create table public.carts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  coupon_code citext,
  updated_at timestamptz not null default now()
);

create trigger carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();
