import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas, DOMMatrix as NapiDOMMatrix, ImageData as NapiImageData, Path2D as NapiPath2D } from "@napi-rs/canvas";
import type { PagePng } from "@/lib/admin/preview/types";

/**
 * Rasteriza a PRIMEIRA página de um PDF com o pdf.js (build legacy, roda no
 * Node/servidor). Usa `@napi-rs/canvas` (binário pré-compilado, funciona no
 * Vercel) como backend de canvas.
 *
 * PDFs que usam as 14 fontes padrão (Helvetica/Times/Courier) precisam dos
 * arquivos de fonte do pdf.js; apontamos `standardFontDataUrl`/`cMapUrl` para
 * dentro de `node_modules/pdfjs-dist` (ver `outputFileTracingIncludes`).
 */

// O pdf.js assume globais de navegador na rasterização.
const g = globalThis as unknown as Record<string, unknown>;
if (!g.DOMMatrix) g.DOMMatrix = NapiDOMMatrix;
if (!g.Path2D) g.Path2D = NapiPath2D;
if (!g.ImageData) g.ImageData = NapiImageData;

// Resolvemos o diretório do pdfjs-dist a partir de `process.cwd()`: funciona
// tanto em dev (raiz do projeto) quanto no runtime do Vercel (`/var/task`),
// onde os arquivos são traçados para `node_modules/pdfjs-dist` (ver
// `outputFileTracingIncludes` no next.config.ts). Evitamos `require.resolve`
// para não deixar o bundler reescrever o especificador como id de módulo.
const pdfjsDir = path.join(process.cwd(), "node_modules", "pdfjs-dist");
const dirUrl = (sub: string) => `${pathToFileURL(path.join(pdfjsDir, sub)).href}/`;

const MAX_WIDTH = 1100;
const MAX_PAGES = 1;

type PdfModule = {
  getDocument: (src: unknown) => { promise: Promise<PdfDocument>; destroy: () => Promise<void> };
};
type PdfDocument = {
  getPage: (n: number) => Promise<PdfPage>;
  numPages: number;
};
type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: Record<string, unknown>) => { promise: Promise<void> };
  cleanup: () => void;
};

export async function renderPdfFirstPage(buffer: Buffer): Promise<PagePng> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfModule;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // Nunca avaliamos código embutido no PDF (segurança).
    isEvalSupported: false,
    useWorkerFetch: false,
    useSystemFonts: false,
    disableFontFace: true,
    standardFontDataUrl: dirUrl("standard_fonts"),
    cMapUrl: dirUrl("cmaps"),
    cMapPacked: true,
  });
  const doc = await loadingTask.promise;

  try {
    if (doc.numPages < MAX_PAGES) throw new Error("PDF sem páginas");
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(MAX_WIDTH / base.width, 3);
    const viewport = page.getViewport({ scale });

    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;
    page.cleanup();

    return { png: canvas.toBuffer("image/png"), width, height };
  } finally {
    await loadingTask.destroy();
  }
}
