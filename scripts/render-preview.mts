/**
 * Testa os renderizadores de preview localmente (sem Next), escrevendo os PNGs
 * em um diretório de saída para inspeção visual.
 *
 * Uso:
 *   node --import ./scripts/_alias.mjs scripts/render-preview.mts <arquivo> [saidaDir]
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { renderPdfFirstPage } from "@/lib/admin/preview/pdf";
import { renderImagePreview } from "@/lib/admin/preview/image";
import { extractEpubCover } from "@/lib/admin/preview/epub";
import { readFirstSheet } from "@/lib/admin/preview/spreadsheet";

const input = process.argv[2];
const outDir = process.argv[3] ?? "/var/folders/48/_c07dcmn38s__s3jdvhttcsr0000gn/T/opencode/preview-out";
if (!input) {
  console.error("informe um arquivo");
  process.exit(1);
}

const ext = path.extname(input).slice(1).toLowerCase();
const buffer = await readFile(input);
await mkdir(outDir, { recursive: true });
const base = path.basename(input, path.extname(input));

console.log(`arquivo: ${input} (${ext}, ${buffer.byteLength} bytes)`);

if (ext === "pdf") {
  const page = await renderPdfFirstPage(buffer);
  const out = path.join(outDir, `${base}-page1.png`);
  await writeFile(out, page.png);
  console.log(`pdf → ${out} (${page.width}x${page.height}, ${page.png.byteLength} bytes de PNG)`);
} else if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "avif", "svg"].includes(ext)) {
  const page = await renderImagePreview(buffer);
  const out = path.join(outDir, `${base}-image.png`);
  await writeFile(out, page.png);
  console.log(`imagem → ${out} (${page.width}x${page.height})`);
} else if (ext === "epub") {
  const cover = extractEpubCover(buffer);
  if (!cover) {
    console.log("epub: sem capa interna (usaria fallback)");
  } else {
    const page = await renderImagePreview(cover);
    const out = path.join(outDir, `${base}-epub-cover.png`);
    await writeFile(out, page.png);
    console.log(`epub → ${out} (${page.width}x${page.height})`);
  }
} else if (ext === "xlsx" || ext === "xlsm") {
  const sheet = await readFirstSheet(buffer);
  if (!sheet) console.log("xlsx: sem conteúdo utilizável (usaria fallback)");
  else console.log(`xlsx → sheet "${sheet.sheetName}" com ${sheet.rows.length} linhas:\n${sheet.rows.slice(0, 3).map((r) => r.join(" | ")).join("\n")}`);
} else {
  console.log(`extensão ${ext}: usaria a capa institucional (fallback)`);
}
