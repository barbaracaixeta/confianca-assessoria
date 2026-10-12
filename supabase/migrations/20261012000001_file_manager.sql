-- =====================================================================
-- Confiança — gerenciador de arquivos dos produtos digitais
-- Aditivo: nada é removido. Adiciona extensão e status aos arquivos,
-- uma visão de estatísticas de download e amplia o limite do bucket.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Status do arquivo: somente arquivos ativos são entregues ao cliente.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_file_status') then
    create type public.product_file_status as enum ('active', 'inactive', 'archived');
  end if;
end $$;

alter table public.product_files
  add column if not exists extension text not null default '',
  add column if not exists status public.product_file_status not null default 'active';

-- Backfill da extensão a partir do nome original (seguro e idempotente).
update public.product_files
set extension = case
  when position('.' in original_name) > 1
    then lower(regexp_replace(original_name, '^.*\.', ''))
  else ''
end
where extension = '';

create index if not exists product_files_status_idx on public.product_files (status);
create index if not exists product_files_extension_idx on public.product_files (extension);

-- ---------------------------------------------------------------------
-- Leitura pública passa a considerar apenas arquivos ATIVOS.
-- A equipe (is_staff) continua vendo todos; is_admin() escreve.
-- ---------------------------------------------------------------------
drop policy if exists "produto-arquivo: leitura pública dos ativos" on public.product_files;
create policy "produto-arquivo: leitura pública dos ativos" on public.product_files
  for select using (
    status = 'active'
    and exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_staff()))
  );

-- ---------------------------------------------------------------------
-- Estatísticas por arquivo (contagem e último download). security_invoker:
-- a visão respeita o RLS de quem consulta (equipe enxerga os números).
-- A escrita em `downloads` continua acontecendo apenas pelo servidor.
-- ---------------------------------------------------------------------
create or replace view public.product_file_stats
  with (security_invoker = true) as
select
  f.id as file_id,
  count(d.id)::int as download_count,
  max(d.created_at) as last_download_at,
  count(distinct d.customer_id)::int as customer_count
from public.product_files f
left join public.downloads d on d.file_id = f.id
group by f.id;

grant select on public.product_file_stats to service_role;

-- ---------------------------------------------------------------------
-- Bucket privado dos arquivos de entrega: amplia o limite por arquivo.
-- Limite da aplicação em src/lib/admin/product-files.ts (MAX_PRODUCT_FILE_SIZE_MB).
-- ATENÇÃO: o limite global de upload do projeto Supabase (Dashboard →
-- Storage → Settings → "Upload file size limit") também precisa ser >= este
-- valor, caso contrário o storage rejeita o arquivo.
-- ---------------------------------------------------------------------
update storage.buckets
set file_size_limit = 52428800
where id = 'product-files';
