-- =====================================================================
-- Confiança — capa/preview automática dos produtos digitais
-- Aditivo: nada é removido. Guarda a preview gerada por arquivo e a
-- referência da capa atual do produto. Reutiliza `products.image_path`,
-- que já é a imagem pública servida pelo bucket `catalog`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- product_files: preview (capa) gerada a partir do próprio arquivo.
--   preview_path         → objeto PNG no bucket público `catalog`.
--   preview_status       → pending | completed | fallback | failed
-- ---------------------------------------------------------------------
alter table public.product_files
  add column if not exists preview_path text,
  add column if not exists preview_status text not null default 'pending',
  add column if not exists preview_generated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_files_preview_status_check') then
    alter table public.product_files
      add constraint product_files_preview_status_check
      check (preview_status in ('pending', 'completed', 'fallback', 'failed'));
  end if;
end $$;

create index if not exists product_files_preview_status_idx on public.product_files (preview_status);

-- ---------------------------------------------------------------------
-- products: qual arquivo é a fonte da capa atual e o estado da capa.
-- `image_path` (já existente) continua sendo o caminho público da capa.
-- A FK com ON DELETE SET NULL garante que nunca fica apontando para um
-- arquivo removido (ver requisitos de exclusão).
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists cover_source_file_id uuid,
  add column if not exists cover_status text not null default 'none',
  add column if not exists cover_generated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_cover_status_check') then
    alter table public.products
      add constraint products_cover_status_check
      check (cover_status in ('none', 'completed', 'fallback', 'failed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_cover_source_file_id_fkey') then
    alter table public.products
      add constraint products_cover_source_file_id_fkey
      foreign key (cover_source_file_id) references public.product_files (id) on delete set null;
  end if;
end $$;
