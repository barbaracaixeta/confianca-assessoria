import "server-only";
import { ImageResponse } from "next/og";
import { extensionOf, fileKind, fileKindLabel } from "@/lib/admin/product-files";
import type { AdminSupabase } from "@/lib/supabase/admin";

/** Paleta institucional (mesma do restante do produto). */
const PINE = "#0B5139";
const GREEN = "#147A55";
const AMBER = "#F28C28";
const AMBER_LIGHT = "#FFB45C";
const PAPER = "#F8FAF8";

/** Formatos que conseguimos embutir (reduzidos + marca d'água) na capa. */
const EMBEDDABLE_IMAGES = new Set(["png", "jpg", "jpeg"]);
/** Acima disso não embutimos a imagem (evita memória/timeout no serverless). */
const EMBED_MAX_BYTES = 5 * 1024 * 1024;

const truncate = (value: string, max: number) => {
  const v = (value ?? "").trim();
  return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v;
};

export interface CoverInput {
  productName: string;
  fileName: string;
  label?: string | null;
  extension: string;
  /** Data URI (image/png|jpeg) quando o arquivo é uma imagem embutível. */
  imageDataUri?: string | null;
}

/**
 * Capa institucional editorial (1200x900, PNG). Nunca usa fontes externas —
 * o `next/og` traz a fonte padrão embutida. Se receber uma imagem, ela é
 * embutida **reduzida** com marca d'água; caso contrário, a capa é tipográfica.
 */
export async function buildCoverPng(input: CoverInput): Promise<ArrayBuffer> {
  const kind = fileKind(input.extension);
  const badge = input.extension ? input.extension.slice(0, 4).toUpperCase() : fileKindLabel(kind).toUpperCase();
  const title = truncate(input.label?.trim() || input.productName || "Material digital", 64);
  const subtitle = input.label && input.productName ? truncate(input.productName, 54) : "Assessoria Acadêmica";
  const fileLine = truncate(input.fileName || "", 44);
  const hasImage = Boolean(input.imageDataUri);

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${PINE} 0%, ${GREEN} 100%)`,
          padding: 72,
          position: "relative",
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: PAPER, fontSize: 30, fontWeight: 700, letterSpacing: 8 }}>
              CONFIANÇA
            </div>
            <div style={{ display: "flex", color: AMBER_LIGHT, fontSize: 15, letterSpacing: 5, marginTop: 8 }}>
              ASSESSORIA ACADÊMICA
            </div>
          </div>
          <div
            style={{
              display: "flex",
              background: AMBER,
              color: PINE,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 2,
              padding: "10px 24px",
              borderRadius: 12,
            }}
          >
            {badge}
          </div>
        </div>

        {/* Miolo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, width: "100%", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, maxWidth: 560 }}>
            <div style={{ display: "flex", color: AMBER_LIGHT, fontSize: 18, letterSpacing: 5, fontWeight: 600 }}>
              MATERIAL ACADÊMICO
            </div>
            <div style={{ display: "flex", color: PAPER, fontSize: 64, fontWeight: 700, lineHeight: 1.05, marginTop: 20 }}>
              {title}
            </div>
            <div style={{ display: "flex", color: PAPER, opacity: 0.75, fontSize: 22, marginTop: 22 }}>{subtitle}</div>
          </div>

          {hasImage ? (
            <div
              style={{
                display: "flex",
                position: "relative",
                width: 400,
                height: 540,
                borderRadius: 16,
                overflow: "hidden",
                border: `1px solid rgba(248,250,248,0.28)`,
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={input.imageDataUri as string} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  top: "44%",
                  left: 0,
                  width: "100%",
                  justifyContent: "center",
                  background: "rgba(11,81,57,0.8)",
                  color: AMBER_LIGHT,
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: 4,
                  padding: "14px 0",
                }}
              >
                CONFIANÇA • PRÉVIA
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                width: 360,
                height: 500,
                borderRadius: 16,
                background: "rgba(248,250,248,0.08)",
                border: `1px solid rgba(248,250,248,0.22)`,
                padding: 36,
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", color: PAPER, opacity: 0.85, fontSize: 30, fontWeight: 700 }}>
                {fileLine || "Arquivo digital"}
              </div>
              <div style={{ display: "flex", width: 64, height: 6, background: AMBER, marginTop: 18, borderRadius: 3 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
                {[1, 0.86, 0.94, 0.7].map((w, i) => (
                  <div key={i} style={{ display: "flex", width: `${w * 100}%`, height: 4, background: "rgba(248,250,248,0.28)", borderRadius: 2 }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ display: "flex", width: "100%", height: 1, background: "rgba(248,250,248,0.25)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: 20 }}>
            <div style={{ display: "flex", color: PAPER, opacity: 0.7, fontSize: 18 }}>Download liberado após a compra</div>
            <div style={{ display: "flex", color: PAPER, opacity: 0.55, fontSize: 18, letterSpacing: 3 }}>MATERIAL DIGITAL</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 900 },
  );
  return response.arrayBuffer();
}

// ---------------------------------------------------------------------------
// Persistência: bucket público, caminho por arquivo e referência no produto.
// ---------------------------------------------------------------------------

export const COVER_BUCKET = "catalog";

export type PreviewStatus = "pending" | "completed" | "fallback" | "failed";

const previewStatuses = ["completed", "fallback"] as const;

const coverPath = (productId: string, fileId: string) => `product-covers/${productId}/${fileId}.png`;

function logCover(message: string, meta: Record<string, unknown>) {
  // Log enxuto no servidor: nunca inclui tokens, paths privados ou chaves.
  console.error(`[cover] ${message}`, meta);
}

async function downloadAsDataUri(admin: AdminSupabase, bucket: string, path: string, ext: string): Promise<string | null> {
  try {
    const { data, error } = await admin.storage.from(bucket).download(path);
    if (error || !data) return null;
    const buffer = Buffer.from(await data.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > EMBED_MAX_BYTES) return null;
    const mime = ext === "png" ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
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
}

/**
 * Gera a capa de um arquivo e guarda no bucket público. NUNCA lança: em falha
 * marca `preview_status = 'failed'` e devolve o status, para não interromper o
 * fluxo de upload (requisito 13/34).
 */
export async function generateFilePreview(
  admin: AdminSupabase,
  opts: { fileId: string; productId: string; productName: string },
): Promise<{ path: string | null; status: PreviewStatus }> {
  try {
    const { data: file } = await admin
      .from("product_files")
      .select("id, product_id, bucket, path, original_name, extension, size_bytes, label")
      .eq("id", opts.fileId)
      .maybeSingle<FileRowLite>();
    if (!file) return { path: null, status: "failed" };

    const extension = (file.extension || extensionOf(file.original_name) || "").toLowerCase();
    let imageDataUri: string | null = null;
    if (EMBEDDABLE_IMAGES.has(extension) && Number(file.size_bytes ?? 0) <= EMBED_MAX_BYTES) {
      imageDataUri = await downloadAsDataUri(admin, file.bucket, file.path, extension);
    }

    const bytes = await buildCoverPng({
      productName: opts.productName,
      fileName: file.original_name,
      label: file.label,
      extension,
      imageDataUri,
    });

    const path = coverPath(opts.productId, opts.fileId);
    const { error } = await admin
      .storage.from(COVER_BUCKET)
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (error) throw new Error(error.message);

    const status: PreviewStatus = imageDataUri ? "completed" : "fallback";
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
 * `onlyIfUnset` garante que uploads posteriores não troquem a capa sozinhos
 * (requisito 14).
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
 * apontando para uma capa inexistente (requisitos 29/30).
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
