import "server-only";
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
/** Planilhas Open XML (xlsx); o antigo .xls (OLE) cai no fallback. */
const SPREADSHEET_EXTS = new Set(["xlsx", "xlsm"]);

export interface RenderInput {
  buffer: Buffer;
  extension: string;
  productName: string;
  fileName: string;
  label?: string | null;
}

/**
 * Gera a imagem de preview de um arquivo. Para PDF/imagem/EPUB/XLSX renderiza a
 * PRIMEIRA página/área real e aplica a marca d'água; para os demais formatos
 * (DOCX/PPTX/ZIP/…) devolve a capa institucional como fallback.
 *
 * NUNCA lança: qualquer falha de renderização cai no fallback institucional,
 * para não interromper o upload.
 */
export async function renderPreview(input: RenderInput): Promise<{ png: Buffer; status: RenderStatus }> {
  const ext = (input.extension || extensionOf(input.fileName) || "").toLowerCase();

  if (input.buffer.byteLength > 0 && input.buffer.byteLength <= MAX_SOURCE_BYTES) {
    try {
      if (ext === "pdf") {
        const page = await renderPdfFirstPage(input.buffer);
        return { png: await composeWatermark(page.png, page.width, page.height), status: "completed" };
      }
      if (IMAGE_EXTS.has(ext)) {
        const page = await renderImagePreview(input.buffer);
        return { png: await composeWatermark(page.png, page.width, page.height), status: "completed" };
      }
      if (ext === "epub") {
        const cover = extractEpubCover(input.buffer);
        if (cover) {
          const page = await renderImagePreview(cover);
          return { png: await composeWatermark(page.png, page.width, page.height), status: "completed" };
        }
      }
      if (SPREADSHEET_EXTS.has(ext)) {
        const sheet = await readFirstSheet(input.buffer);
        if (sheet) {
          const { png } = await renderSpreadsheetPreview({
            productName: input.productName,
            sheetName: sheet.sheetName,
            rows: sheet.rows,
          });
          return { png, status: "completed" };
        }
      }
    } catch {
      /* cai no fallback institucional */
    }
  }

  return {
    png: await buildCoverPng({
      productName: input.productName,
      fileName: input.fileName,
      label: input.label,
      extension: ext,
    }),
    status: "fallback",
  };
}
