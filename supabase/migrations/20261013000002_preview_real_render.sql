-- =====================================================================
-- Confiança — preview real da primeira página (render por tipo de arquivo)
-- Aditivo. Apenas amplia o ciclo de vida do status do preview para incluir
-- `processing` (enquanto a imagem está sendo renderizada). Nenhuma coluna
-- nova é necessária: reutilizamos preview_path/preview_status/
-- preview_generated_at (product_files) e image_path/cover_source_file_id/
-- cover_status (products).
-- =====================================================================

alter table public.product_files
  drop constraint if exists product_files_preview_status_check;

alter table public.product_files
  add constraint product_files_preview_status_check
  check (preview_status in ('pending', 'processing', 'completed', 'fallback', 'failed'));

comment on column public.product_files.preview_path is
  'Objeto WebP no bucket público `catalog` com a PRIMEIRA página/área real do arquivo (PDF/imagem/EPUB/XLSX) ou a capa institucional (fallback).';
