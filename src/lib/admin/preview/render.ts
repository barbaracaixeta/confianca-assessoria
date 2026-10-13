import "server-only";
import sharp from "sharp";
import { extensionOf } from "@/lib/admin/product-files";
import { renderPdfFirstPage } from "@/lib/admin/preview/pdf";
import { renderImagePreview } from "@/lib/admin/preview/image";
import { extractEpubCover } from "@/lib/admin/preview/epub";
import { readFirstSheet } from "@/lib/admin/preview/spreadsheet";
import { composeWatermark, renderSpreadsheetPreview } from "@/lib/admin/preview/compose";
import { buildCoverPng } from "@/lib/admin/preview/institutional-cover";

/** Status de geração do preview persistido em `product_files.preview_status`. */
export type RenderStatus = "completed" | "fallback";

/** Acima disso não tentamos renderizar (memória/timeout no serverless). */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/** Extensões que conseguimos rasterizar como imagem. */
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "tif", "avif", "svg", "heic", "heif"]);
/**
 * Imagens que o navegador exibe nativamente — usadas como CAPA exatamente como
 * enviadas (sem re-render). Demais formatos de imagem são normalizados.
 */
const RAW_IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "avif", "svg"]);
/** Planilhas Open XML (xlsx); o antigo .xls (OLE) cai no fallback. */
const SPREADSHEET_EXTS = new Set(["xlsx", "xlsm"]);

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
};

/** Objeto pronto para upload (bytes finais + extensão + tipo). */
export interface RenderArtifact {
  data: Buffer;
  extension: string;
  contentType: string;
}

export interface RenderResult {
  /** Capa: limpa, sem marca d'água (imagem exata quando for imagem). */
  cover: RenderArtifact;
  /** Prévia do conteúdo: com marca d'água. */
  preview: RenderArtifact;
  status: RenderStatus;
}

export interface RenderInput {
  buffer: Buffer;
  extension: string;
  productName: string;
  fileName: string;
  label?: string | null;
}

/** Extensão usada no objeto de capa limpa para uma fonte qualquer. */
export function cleanCoverExtension(sourceExtension: string): string {
  const ext = sourceExtension.toLowerCase();
  if (RAW_IMAGE_EXTS.has(ext)) return ext === "jpeg" ? "jpg" : ext;
  return "webp";
}

const webp = (png: Buffer) => sharp(png).webp({ quality: 82, effort: 4 }).toBuffer();

const webpArtifact = async (png: Buffer): Promise<RenderArtifact> => ({
  data: await webp(png),
  extension: "webp",
  contentType: "image/webp",
});

/**
 * Gera a imagem de capa (limpa) e a prévia (com marca d'água) de um arquivo.
 *
 * - PDF → primeira página real
 * - imagem → a própria imagem (capa exata) / normalizada
 * - EPUB → capa interna
 * - XLSX → primeira área da planilha
 * - demais (DOCX/PPTX/ZIP…) → capa institucional
 *
 * NUNCA lança: qualquer falha de renderização cai no fallback institucional,
 * para não interromper o upload.
 */
export async function renderPreview(input: RenderInput): Promise<RenderResult> {
  const ext = (input.extension || extensionOf(input.fileName) || "").toLowerCase();

  if (input.buffer.byteLength > 0 && input.buffer.byteLength <= MAX_SOURCE_BYTES) {
    try {
      if (ext === "pdf") {
        const page = await renderPdfFirstPage(input.buffer);
        const watermarked = await composeWatermark(page.png, page.width, page.height);
        return {
          cover: await webpArtifact(page.png),
          preview: await webpArtifact(watermarked),
          status: "completed",
        };
      }

      if (IMAGE_EXTS.has(ext)) {
        const page = await renderImagePreview(input.buffer);
        const watermarked = await composeWatermark(page.png, page.width, page.height);
        const cover: RenderArtifact = RAW_IMAGE_EXTS.has(ext)
          ? { data: input.buffer, extension: cleanCoverExtension(ext), contentType: MIME_BY_EXT[ext] ?? "application/octet-stream" }
          : await webpArtifact(page.png);
        return { cover, preview: await webpArtifact(watermarked), status: "completed" };
      }

      if (ext === "epub") {
        const epubCover = extractEpubCover(input.buffer);
        if (epubCover) {
          const page = await renderImagePreview(epubCover);
          const watermarked = await composeWatermark(page.png, page.width, page.height);
          return {
            cover: await webpArtifact(page.png),
            preview: await webpArtifact(watermarked),
            status: "completed",
          };
        }
      }

      if (SPREADSHEET_EXTS.has(ext)) {
        const sheet = await readFirstSheet(input.buffer);
        if (sheet) {
          const data = { productName: input.productName, sheetName: sheet.sheetName, rows: sheet.rows };
          const clean = await renderSpreadsheetPreview(data, { watermark: false });
          const marked = await renderSpreadsheetPreview(data, { watermark: true });
          return {
            cover: await webpArtifact(clean.png),
            preview: await webpArtifact(marked.png),
            status: "completed",
          };
        }
      }
    } catch {
      /* cai no fallback institucional */
    }
  }

  const png = await buildCoverPng({
    productName: input.productName,
    fileName: input.fileName,
    label: input.label,
    extension: ext,
  });
  const fallback = await webpArtifact(png);
  return { cover: fallback, preview: fallback, status: "fallback" };
}
