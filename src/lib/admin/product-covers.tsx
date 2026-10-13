import "server-only";
import sharp from "sharp";
import { extensionOf } from "@/lib/admin/product-files";
import { renderPreview } from "@/lib/admin/preview/render";
import type { AdminSupabase } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Persistência: bucket público, caminho por arquivo e referência no produto.
// ---------------------------------------------------------------------------

export const COVER_BUCKET = "catalog";

export type PreviewStatus = "pending" | "processing" | "completed" | "fallback" | "failed";

/** Status em que já existe uma imagem utilizável como capa. */
const previewStatuses = ["completed", "fallback"] as const;

/** Preview sempre em WebP (leve, nítido e adequado a e-commerce). */
const coverPath = (productId: string, fileId: string) => `product-covers/${productId}/${fileId}.webp`;

function logCover(message: string, meta: Record<string, unknown>) {
  // Log enxuto no servidor: nunca inclui tokens, paths privados ou chaves.
  console.error(`[cover] ${message}`, meta);
}

interface FileRowLite {
  id: string;
  product_id: string;
  bucket: string;
  path: string;
  original_name: string;
  extension: string | null;
  size_bytes: number | null;
  label: string | null;
  preview_path: string | null;
}

/**
 * Gera o preview de um arquivo e guarda no bucket público (WebP). O preview é a
 * PRIMEIRA página/área real do documento quando renderizável (PDF/imagem/EPUB/
 * XLSX), com marca d'água; nos demais formatos (DOCX/PPTX/ZIP/…) é a capa
 * institucional.
 *
 * NUNCA lança: em falha marca `preview_status = 'failed'` e devolve o status,
 * para não interromper o upload.
 */
export async function generateFilePreview(
  admin: AdminSupabase,
  opts: { fileId: string; productId: string; productName: string },
): Promise<{ path: string | null; status: PreviewStatus }> {
  try {
    const { data: file } = await admin
      .from("product_files")
      .select("id, product_id, bucket, path, original_name, extension, size_bytes, label, preview_path")
      .eq("id", opts.fileId)
      .maybeSingle<FileRowLite>();
    if (!file) return { path: null, status: "failed" };

    // Marca como "gerando…" para a UI acompanhar o progresso.
    await admin.from("product_files").update({ preview_status: "processing" }).eq("id", opts.fileId);

    const { data: blob, error: downloadError } = await admin.storage.from(file.bucket).download(file.path);
    if (downloadError || !blob) throw new Error(downloadError?.message ?? "arquivo original indisponível");
    const buffer = Buffer.from(await blob.arrayBuffer());

    const extension = (file.extension || extensionOf(file.original_name) || "").toLowerCase();
    const { png, status } = await renderPreview({
      buffer,
      extension,
      productName: opts.productName,
      fileName: file.original_name,
      label: file.label,
    });

    const webp = await sharp(png).webp({ quality: 82, effort: 4 }).toBuffer();

    const path = coverPath(opts.productId, opts.fileId);
    const { error } = await admin
      .storage.from(COVER_BUCKET)
      .upload(path, webp, { contentType: "image/webp", upsert: true });
    if (error) throw new Error(error.message);

    // Remove um preview antigo com outro caminho/extensão (ex.: .png legado).
    if (file.preview_path && file.preview_path !== path) {
      try {
        await admin.storage.from(COVER_BUCKET).remove([file.preview_path]);
      } catch {
        /* objeto órfão não é crítico */
      }
    }

    await admin
      .from("product_files")
      .update({ preview_path: path, preview_status: status, preview_generated_at: new Date().toISOString() })
      .eq("id", opts.fileId);
    return { path, status };
  } catch (err) {
    try {
      await admin.from("product_files").update({ preview_status: "failed" }).eq("id", opts.fileId);
    } catch {
      /* ignora: o mais importante é não quebrar o upload */
    }
    logCover("falha ao gerar preview", { fileId: opts.fileId, message: err instanceof Error ? err.message : "erro" });
    return { path: null, status: "failed" };
  }
}

async function firstFileWithPreview(admin: AdminSupabase, productId: string, excludeFileId?: string) {
  const { data } = await admin
    .from("product_files")
    .select("id, preview_path, preview_status")
    .eq("product_id", productId)
    .in("preview_status", previewStatuses as unknown as string[])
    .not("preview_path", "is", null)
    .order("created_at", { ascending: true });
  return (data ?? []).find((f) => f.preview_path && f.id !== excludeFileId) ?? null;
}

/**
 * Define a capa do produto a partir de um arquivo já processado.
 * `onlyIfUnset` garante que uploads posteriores não troquem a capa sozinhos.
 */
export async function assignProductCover(
  admin: AdminSupabase,
  productId: string,
  opts: { onlyIfUnset: boolean; excludeFileId?: string },
): Promise<string | null> {
  const { data: product } = await admin
    .from("products")
    .select("image_path")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return null;
  if (opts.onlyIfUnset && product.image_path) return product.image_path;

  const candidate = await firstFileWithPreview(admin, productId, opts.excludeFileId);
  if (!candidate?.preview_path) return null;

  await admin
    .from("products")
    .update({
      image_path: candidate.preview_path,
      cover_source_file_id: candidate.id,
      cover_status: candidate.preview_status,
      cover_generated_at: new Date().toISOString(),
    })
    .eq("id", productId);
  return candidate.preview_path;
}

/** Troca a fonte da capa (e opcionalmente regenera o preview daquele arquivo). */
export async function setProductCoverSource(
  admin: AdminSupabase,
  opts: { productId: string; productName: string; fileId: string; regenerate: boolean },
): Promise<{ path: string | null; status: PreviewStatus }> {
  let preview = opts.regenerate
    ? await generateFilePreview(admin, { fileId: opts.fileId, productId: opts.productId, productName: opts.productName })
    : null;

  if (!preview?.path) {
    const { data: file } = await admin
      .from("product_files")
      .select("preview_path, preview_status")
      .eq("id", opts.fileId)
      .maybeSingle<{ preview_path: string | null; preview_status: PreviewStatus | null }>();
    if (file?.preview_path) preview = { path: file.preview_path, status: file.preview_status ?? "fallback" };
    else preview = await generateFilePreview(admin, { fileId: opts.fileId, productId: opts.productId, productName: opts.productName });
  }

  if (!preview?.path) return { path: null, status: "failed" };

  await admin
    .from("products")
    .update({
      image_path: preview.path,
      cover_source_file_id: opts.fileId,
      cover_status: preview.status,
      cover_generated_at: new Date().toISOString(),
    })
    .eq("id", opts.productId);
  return preview;
}

/**
 * Chamado após excluir um arquivo: remove o objeto da capa e, se a capa dependia
 * dele, repontua para outro arquivo (ou limpa a capa). Nunca deixa o produto
 * apontando para uma capa inexistente.
 */
export async function fixCoverAfterFileChange(
  admin: AdminSupabase,
  opts: { productId: string; removedFileId: string; removedPreviewPath: string | null },
): Promise<void> {
  if (opts.removedPreviewPath) {
    try {
      await admin.storage.from(COVER_BUCKET).remove([opts.removedPreviewPath]);
    } catch {
      /* objeto órfão no bucket não é crítico */
    }
  }

  const { data: product } = await admin
    .from("products")
    .select("image_path, cover_source_file_id")
    .eq("id", opts.productId)
    .maybeSingle();
  if (!product) return;

  const dependedOnRemoved =
    product.cover_source_file_id === opts.removedFileId ||
    (!!opts.removedPreviewPath && product.image_path === opts.removedPreviewPath);

  if (!dependedOnRemoved && product.image_path) {
    const { data: owner } = await admin
      .from("product_files")
      .select("id")
      .eq("product_id", opts.productId)
      .eq("preview_path", product.image_path)
      .maybeSingle();
    if (owner) return; // capa ainda é válida
  }

  const candidate = await firstFileWithPreview(admin, opts.productId);
  if (candidate?.preview_path) {
    await admin
      .from("products")
      .update({
        image_path: candidate.preview_path,
        cover_source_file_id: candidate.id,
        cover_status: candidate.preview_status,
        cover_generated_at: new Date().toISOString(),
      })
      .eq("id", opts.productId);
  } else {
    await admin
      .from("products")
      .update({ image_path: null, cover_source_file_id: null, cover_status: "none", cover_generated_at: null })
      .eq("id", opts.productId);
  }
}
