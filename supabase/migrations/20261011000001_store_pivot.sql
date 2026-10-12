-- =====================================================================
-- Confiança — evolução para loja de produtos digitais
-- Aditivo: nada é removido; extensões de produtos, arquivos de entrega,
-- registros de download e bucket privado de materiais.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipo de produto (digital agora; físico/misto preparado para o futuro)
-- ---------------------------------------------------------------------
create type public.product_type as enum ('digital', 'physical', 'mixed');

-- ---------------------------------------------------------------------
-- Extensão de produtos
-- ---------------------------------------------------------------------
alter table public.products
  add column product_type public.product_type not null default 'digital',
  add column sku text check (sku is null or char_length(sku) between 1 and 40),
  add column stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  add column weight_grams integer check (weight_grams is null or weight_grams > 0),
  add column length_cm numeric(6,2) check (length_cm is null or length_cm > 0),
  add column width_cm numeric(6,2) check (width_cm is null or width_cm > 0),
  add column height_cm numeric(6,2) check (height_cm is null or height_cm > 0),
  -- Indicações editoriais exibidas no catálogo (independentes de preço)
  add column is_new boolean not null default false,
  add column is_best_seller boolean not null default false,
  add column download_limit integer check (download_limit is null or download_limit > 0);

comment on column public.products.download_limit is 'Limite de downloads por cliente (null = ilimitado).';

-- ---------------------------------------------------------------------
-- Arquivos de entrega dos produtos digitais (Storage privado)
-- ---------------------------------------------------------------------
create table public.product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  bucket text not null default 'product-files',
  path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  -- Rótulo exibido ao cliente (ex.: "PDF guia completo", "Pacote ZIP")
  label text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path)
);

create index product_files_product_idx on public.product_files (product_id, sort_order);

create trigger product_files_updated_at before update on public.product_files
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Downloads (auditoria + controle de limite)
-- ---------------------------------------------------------------------
create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.product_files (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid references public.orders (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  ip text,
  created_at timestamptz not null default now()
);

create index downloads_customer_idx on public.downloads (customer_id, created_at desc);
create index downloads_order_idx on public.downloads (order_id);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.product_files enable row level security;
alter table public.downloads enable row level security;

-- Produto com arquivo precisa ser ativo (público) para a leitura da lista
create policy "produto-arquivo: leitura pública dos ativos" on public.product_files
  for select using (
    exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_staff()))
  );
create policy "produto-arquivo: admin escreve" on public.product_files
  for all using (public.is_admin()) with check (public.is_admin());

-- Histórico de downloads só para a equipe (a gravação acontece pelo servidor)
create policy "downloads: equipe lê" on public.downloads
  for select using (public.is_staff());

-- ---------------------------------------------------------------------
-- Storage: bucket privado de materiais digitais
--   produto-files: privado; caminho = <product_id>/<arquivo>. Acesso
--                  somente através de URL assinada após validar a compra.
-- ---------------------------------------------------------------------
-- Bucket privado dos arquivos de entrega. allowed_mime_types fica NULL de propósito:
-- o admin pode subir documentos em qualquer formato (o upload já valida tamanho).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-files',
  'product-files',
  false,
  26214400,
  null
)
on conflict (id) do nothing;

create policy "produto-files: equipe lê" on storage.objects
  for select using (bucket_id = 'product-files' and public.is_staff());
create policy "produto-files: equipe escreve" on storage.objects
  for insert with check (bucket_id = 'product-files' and public.is_staff());
create policy "produto-files: equipe atualiza" on storage.objects
  for update using (bucket_id = 'product-files' and public.is_staff());
create policy "produto-files: equipe remove" on storage.objects
  for delete using (bucket_id = 'product-files' and public.is_staff());