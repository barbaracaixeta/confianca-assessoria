import sharp from "sharp";
import type { PagePng } from "@/lib/admin/preview/types";

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 4000;

/**
 * Normaliza uma imagem enviada (PNG/JPG/WEBP/GIF/BMP/TIFF/AVIF/SVG…) para um PNG
 * de preview: aplica rotação EXIF, limita o tamanho e preserva a proporção.
 * A marca d'água é aplicada depois na composição.
 */
export async function renderImagePreview(buffer: Buffer): Promise<PagePng> {
  const pipeline = sharp(buffer, { failOn: "none", animated: false }).rotate().resize({
    width: MAX_WIDTH,
    height: MAX_HEIGHT,
    fit: "inside",
    withoutEnlargement: true,
  });

  const { data, info } = await pipeline.png().toBuffer({ resolveWithObject: true });
  return { png: data, width: info.width, height: info.height };
}
