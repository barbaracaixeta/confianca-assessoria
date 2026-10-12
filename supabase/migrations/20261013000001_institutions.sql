-- =====================================================================
-- Instituições de ensino: dimensão de organização do catálogo que coexiste
-- com `categories` (independente e opcional). Aditivo: nada é removido e os
-- produtos antigos permanecem válidos com `institution_id` nulo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Instituições
-- ---------------------------------------------------------------------
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  -- Caminho no bucket público `catalog` ou URL absoluta (mesmo padrão das capas)
  logo_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger institutions_updated_at before update on public.institutions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Relacionamento opcional produto -> instituição.
-- ON DELETE SET NULL preserva o produto caso a instituição seja removida.
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists institution_id uuid references public.institutions (id) on delete set null;

create index if not exists products_institution_idx on public.products (institution_id);
create index if not exists products_institution_active_idx on public.products (institution_id, is_active);

-- ---------------------------------------------------------------------
-- RLS (mesmo desenho de `categories`)
-- ---------------------------------------------------------------------
alter table public.institutions enable row level security;

create policy "instituicoes: leitura pública das ativas" on public.institutions
  for select using (is_active or public.is_staff());
create policy "instituicoes: admin escreve" on public.institutions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Seed inicial das instituições conhecidas (idempotente por id)
-- ---------------------------------------------------------------------
insert into public.institutions (id, name, slug, sort_order, is_active)
values
  ('00000000-0000-4000-8000-000000000301', 'UNOPAR', 'unopar', 1, true),
  ('00000000-0000-4000-8000-000000000302', 'UNIASSELVI', 'uniasselvi', 2, true),
  ('00000000-0000-4000-8000-000000000303', 'Anhanguera', 'anhanguera', 3, true),
  ('00000000-0000-4000-8000-000000000304', 'Estácio', 'estacio', 4, true)
on conflict (id) do nothing;
