import "server-only";
import { extensionOf } from "@/lib/admin/product-files";
import { cleanCoverExtension, renderPreview } from "@/lib/admin/preview/render";
import type { AdminSupabase } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Persistência: bucket público, caminho por arquivo e referência no produto.
// ---------------------------------------------------------------------------

export const COVER_BUCKET = "catalog";

export type PreviewStatus = "pending" | "processing" | "completed" | "fallback" | "failed";

/** Status em que já existe uma imagem utilizável como capa. */
const previewStatuses = ["completed", "fallback"] as const;

/** Prévia do conteúdo (com marca d'água), exibida como thumbnail. */
const previewObjectPath = (productId: string, fileId: string) => `product-covers/${productId}/${fileId}.webp`;

/** Capa limpa (sem marca d'água), usada na loja e nos cards. */
const coverObjectPath = (productId: string, fileId: string, sourceExt: string) =>
  `product-covers/${productId}/${fileId}-cover.${cleanCoverExtension(sourceExt)}`;

function logCover(message: string, meta: Record<string, unknown>) {
  // Log enxuto no servidor: nunca inclui tokens, paths privados ou chaves.
  console.error(`[cover] ${message}`, meta);
}

/** Remove objetos do bucket público sem deixar erro crítico. */
async function removeObjects(admin: AdminSupabase, paths: (string | null | undefined)[]) {
  const keys = paths.filter((p): p is string => !!p);
  if (keys.length === 0) return;
  try {
    await admin.storage.from(COVER_BUCKET).remove(keys);
  } catch {
    /* objeto órfão não é crítico */
  }
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
 * Gera a capa (limpa, sem marca d'água) e a prévia (com marca d'água) de um
 * arquivo e guarda ambas no bucket público. A capa é a PRIMEIRA página/área
 * real do documento quando renderizável (PDF/imagem/EPUB/XLSX) — para imagens,
 * é a própria imagem enviada, sem alteração. Nos demais formatos
 * (DOCX/PPTX/ZIP/…) ambas usam a capa institucional.
 *
 * NUNCA lança: em falha marca `preview_status = 'failed'` e devolve o status,
 * para não interromper o upload.
 */
export async function generateFilePreview(
  admin: AdminSupabase,
  opts: { fileId: string; productId: string; productName: string },
): Promise<{ coverPath: string | null; previewPath: string | null; status: PreviewStatus }> {
  try {
    const { data: file } = await admin
      .from("product_files")
      .select("id, product_id, bucket, path, original_name, extension, size_bytes, label, preview_path")
      .eq("id", opts.fileId)
      .maybeSingle<FileRowLite>();
    if (!file) return { coverPath: null, previewPath: null, status: "failed" };

    // Marca como "gerando…" para a UI acompanhar o progresso.
    await admin.from("product_files").update({ preview_status: "processing" }).eq("id", opts.fileId);

    const { data: blob, error: downloadError } = await admin.storage.from(file.bucket).download(file.path);
    if (downloadError || !blob) throw new Error(downloadError?.message ?? "arquivo original indisponível");
    const buffer = Buffer.from(await blob.arrayBuffer());

    const extension = (file.extension || extensionOf(file.original_name) || "").toLowerCase();
    const { cover, preview, status } = await renderPreview({
      buffer,
      extension,
      productName: opts.productName,
      fileName: file.original_name,
      label: file.label,
    });

    const previewPath = previewObjectPath(opts.productId, opts.fileId);
    const coverPath = coverObjectPath(opts.productId, opts.fileId, cover.extension);

    const uploads = await Promise.all([
      admin.storage.from(COVER_BUCKET).upload(previewPath, preview.data, { contentType: preview.contentType, upsert: true }),
      admin.storage.from(COVER_BUCKET).upload(coverPath, cover.data, { contentType: cover.contentType, upsert: true }),
    ]);
    const uploadError = uploads.find((u) => u.error)?.error;
    if (uploadError) throw new Error(uploadError.message);

    const { data: product } = await admin
      .from("products")
      .select("image_path, cover_source_file_id")
      .eq("id", opts.productId)
      .maybeSingle<{ image_path: string | null; cover_source_file_id: string | null }>();

    // Remove objetos antigos (prévia/capa com outro caminho/extensão, ex.: .png
    // legado), NUNCA os que acabamos de gravar — um deles pode coincidir com o
    // caminho herdado de `image_path`.
    await removeObjects(
      admin,
      [file.preview_path, product?.image_path].filter((p) => p && p !== previewPath && p !== coverPath),
    );

    // Se este arquivo é a capa atual do produto, mantém a capa apontando para a
    // nova versão limpa.
    if (product?.cover_source_file_id === opts.fileId) {
      await admin
        .from("products")
        .update({ image_path: coverPath, cover_status: status, cover_generated_at: new Date().toISOString() })
        .eq("id", opts.productId);
    }

    await admin
      .from("product_files")
      .update({ preview_path: previewPath, preview_status: status, preview_generated_at: new Date().toISOString() })
      .eq("id", opts.fileId);
    return { coverPath, previewPath, status };
  } catch (err) {
    try {
      await admin.from("product_files").update({ preview_status: "failed" }).eq("id", opts.fileId);
    } catch {
      /* ignora: o mais importante é não quebrar o upload */
    }
    logCover("falha ao gerar preview", { fileId: opts.fileId, message: err instanceof Error ? err.message : "erro" });
    return { coverPath: null, previewPath: null, status: "failed" };
  }
}

interface PreviewCandidate {
  id: string;
  preview_path: string | null;
  preview_status: string | null;
  extension: string | null;
}

async function firstFileWithPreview(admin: AdminSupabase, productId: string, excludeFileId?: string): Promise<PreviewCandidate | null> {
  const { data } = await admin
    .from("product_files")
    .select("id, preview_path, preview_status, extension")
    .eq("product_id", productId)
    .in("preview_status", previewStatuses as unknown as string[])
    .not("preview_path", "is", null)
    .order("created_at", { ascending: true });
  return (data ?? []).find((f) => f.preview_path && f.id !== excludeFileId) ?? null;
}

/** Define a capa do produto a partir de um arquivo já processado. */
async function pointProductAtFile(admin: AdminSupabase, productId: string, candidate: PreviewCandidate): Promise<string> {
  const coverPath = coverObjectPath(productId, candidate.id, candidate.extension ?? "");
  const previewPath = previewObjectPath(productId, candidate.id);

  const { data: product } = await admin.from("products").select("image_path").eq("id", productId).maybeSingle();
  if (product?.image_path && product.image_path !== coverPath && product.image_path !== previewPath) {
    await removeObjects(admin, [product.image_path]);
  }

  await admin
    .from("products")
    .update({
      image_path: coverPath,
      cover_source_file_id: candidate.id,
      cover_status: candidate.preview_status ?? "fallback",
      cover_generated_at: new Date().toISOString(),
    })
    .eq("id", productId);
  return coverPath;
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
  const { data: product } = await admin.from("products").select("image_path").eq("id", productId).maybeSingle();
  if (!product) return null;
  if (opts.onlyIfUnset && product.image_path) return product.image_path;

  const candidate = await firstFileWithPreview(admin, productId, opts.excludeFileId);
  if (!candidate?.preview_path) return null;
  return pointProductAtFile(admin, productId, candidate);
}

/** Troca a fonte da capa (e opcionalmente regenera a capa/prévia daquele arquivo). */
export async function setProductCoverSource(
  admin: AdminSupabase,
  opts: { productId: string; productName: string; fileId: string; regenerate: boolean },
): Promise<{ path: string | null; status: PreviewStatus }> {
  let resolved: { coverPath: string; status: PreviewStatus } | null = null;

  if (opts.regenerate) {
    const gen = await generateFilePreview(admin, { fileId: opts.fileId, productId: opts.productId, productName: opts.productName });
    if (gen.coverPath) resolved = { coverPath: gen.coverPath, status: gen.status };
  }

  if (!resolved) {
    const { data: file } = await admin
      .from("product_files")
      .select("preview_path, preview_status, extension")
      .eq("id", opts.fileId)
      .maybeSingle<{ preview_path: string | null; preview_status: PreviewStatus | null; extension: string | null }>();
    if (file?.preview_path) {
      const coverPath = coverObjectPath(opts.productId, opts.fileId, file.extension ?? "");
      const previewPath = previewObjectPath(opts.productId, opts.fileId);
      const { data: product } = await admin.from("products").select("image_path").eq("id", opts.productId).maybeSingle();
      if (product?.image_path && product.image_path !== coverPath && product.image_path !== previewPath) {
        await removeObjects(admin, [product.image_path]);
      }
      await admin
        .from("products")
        .update({
          image_path: coverPath,
          cover_source_file_id: opts.fileId,
          cover_status: file.preview_status ?? "fallback",
          cover_generated_at: new Date().toISOString(),
        })
        .eq("id", opts.productId);
      resolved = { coverPath, status: file.preview_status ?? "fallback" };
    } else {
      const gen = await generateFilePreview(admin, { fileId: opts.fileId, productId: opts.productId, productName: opts.productName });
      if (gen.coverPath) resolved = { coverPath: gen.coverPath, status: gen.status };
    }
  }

  if (!resolved) return { path: null, status: "failed" };
  return { path: resolved.coverPath, status: resolved.status };
}

/**
 * Chamado após excluir um arquivo: remove os objetos (prévia e capa) e, se a
 * capa dependia dele, repontua para outro arquivo (ou limpa a capa). Nunca
 * deixa o produto apontando para uma capa inexistente.
 */
export async function fixCoverAfterFileChange(
  admin: AdminSupabase,
  opts: { productId: string; removedFileId: string; removedPreviewPath: string | null; removedExtension?: string | null },
): Promise<void> {
  await removeObjects(admin, [
    opts.removedPreviewPath,
    coverObjectPath(opts.productId, opts.removedFileId, opts.removedExtension ?? ""),
  ]);

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
    await pointProductAtFile(admin, opts.productId, candidate);
  } else {
    await admin
      .from("products")
      .update({ image_path: null, cover_source_file_id: null, cover_status: "none", cover_generated_at: null })
      .eq("id", opts.productId);
  }
}
