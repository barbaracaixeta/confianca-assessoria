import { ImageResponse } from "next/og";
import { AMBER, PAPER, PINE } from "@/lib/admin/preview/institutional-cover";

/**
 * Composição final do preview. Usamos `next/og` (Satori) para desenhar a marca
 * d'água porque ele traz uma fonte embutida — no Vercel serverless não há fontes
 * de sistema, então desenhar texto direto no canvas sairia vazio.
 *
 * O preview final é sempre PNG; a conversão para WebP acontece depois (sharp).
 */

const WATERMARK_TEXT = "CONFIANÇA • PRÉVIA";

function WatermarkOverlay({ width, height }: { width: number; height: number }) {
  const scale = width / 1000;
  const fontSize = Math.round(26 * scale) + 8;
  const rowGap = Math.round(150 * scale) + 40;
  const colGap = Math.round(320 * scale) + 120;
  const rows = Math.max(3, Math.ceil(height / rowGap) + 1);
  const cols = Math.max(3, Math.ceil(width / colGap) + 1);

  return (
    <div
      style={{
        position: "absolute",
        top: -Math.round(height * 0.1),
        left: -Math.round(width * 0.15),
        width: width * 1.4,
        height: height * 1.2,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: rowGap,
        transform: "rotate(-22deg)",
      }}
    >
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "flex", flexDirection: "row", gap: colGap, alignItems: "center" }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              style={{
                display: "flex",
                color: "rgba(11,81,57,0.26)",
                fontSize,
                fontWeight: 700,
                letterSpacing: Math.round(6 * scale) + 2,
                whiteSpace: "nowrap",
              }}
            >
              {WATERMARK_TEXT}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function BrandFooter({ width }: { width: number }) {
  const scale = width / 1000;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width,
        height: Math.round(56 * scale) + 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: Math.round(28 * scale) + 8,
        paddingRight: Math.round(28 * scale) + 8,
        background: `linear-gradient(90deg, ${PINE} 0%, #0A452F 100%)`,
      }}
    >
      <div style={{ display: "flex", color: PAPER, fontSize: Math.round(20 * scale) + 6, letterSpacing: 6, fontWeight: 700 }}>
        CONFIANÇA
      </div>
      <div style={{ display: "flex", color: AMBER, fontSize: Math.round(18 * scale) + 4, letterSpacing: 4, fontWeight: 600 }}>
        PRÉVIA
      </div>
    </div>
  );
}

/**
 * Aplica a marca d'água institucional sobre a imagem da primeira página
 * renderizada, preservando a proporção original (as dimensões do preview são
 * exatamente as da página).
 */
export async function composeWatermark(pagePng: Buffer, width: number, height: number): Promise<Buffer> {
  const dataUri = `data:image/png;base64,${pagePng.toString("base64")}`;
  const response = new ImageResponse(
    (
      <div style={{ width, height, display: "flex", position: "relative", background: "#FFFFFF", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} alt="" width={width} height={height} style={{ position: "absolute", top: 0, left: 0, width, height }} />
        <WatermarkOverlay width={width} height={height} />
        <BrandFooter width={width} />
      </div>
    ),
    { width, height },
  );
  return Buffer.from(await response.arrayBuffer());
}

export interface SheetData {
  productName: string;
  sheetName: string;
  rows: string[][];
}

const GRID_ROW_HEIGHT = 34;
const GRID_WIDTH = 1140;
const GRID_PAD = 30;

/**
 * Preview da primeira worksheet: desenha a grade real da planilha (com a fonte
 * embutida do Satori) e aplica a marca d'água. É uma representação fiel do
 * conteúdo, não uma capa genérica.
 */
export async function renderSpreadsheetPreview(sheet: SheetData): Promise<{ png: Buffer; width: number; height: number }> {
  const rows = sheet.rows.slice(0, 28);
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const colWidth = Math.max(90, Math.floor((GRID_WIDTH - GRID_PAD * 2) / Math.min(cols, 8)));

  const headerHeight = 92;
  const gridHeight = rows.length * GRID_ROW_HEIGHT;
  const width = GRID_WIDTH;
  const height = headerHeight + GRID_PAD + gridHeight + GRID_PAD + 30;

  const response = new ImageResponse(
    (
      <div style={{ width, height, display: "flex", flexDirection: "column", background: PAPER, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: headerHeight,
            paddingLeft: GRID_PAD,
            paddingRight: GRID_PAD,
            background: `linear-gradient(90deg, ${PINE} 0%, #0A452F 100%)`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: PAPER, fontSize: 30, fontWeight: 700, letterSpacing: 1 }}>
              {sheet.productName}
            </div>
            <div style={{ display: "flex", color: AMBER, fontSize: 18, letterSpacing: 4, marginTop: 6 }}>
              {sheet.sheetName.toUpperCase()}
            </div>
          </div>
          <div style={{ display: "flex", color: PAPER, fontSize: 16, letterSpacing: 4, opacity: 0.8 }}>
            CONFIANÇA
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", margin: GRID_PAD, border: "1px solid #D7DEDA" }}>
          {rows.map((row, r) => (
            <div
              key={r}
              style={{
                display: "flex",
                height: GRID_ROW_HEIGHT,
                background: r === 0 ? "#E8F0EB" : "#FFFFFF",
                borderBottom: r === rows.length - 1 ? "0px" : "1px solid #E2E8E4",
              }}
            >
              {Array.from({ length: cols }).map((_, c) => (
                <div
                  key={c}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: colWidth,
                    paddingLeft: 10,
                    paddingRight: 10,
                    borderRight: c === cols - 1 ? "0px" : "1px solid #E2E8E4",
                    overflow: "hidden",
                    fontSize: 15,
                    color: r === 0 ? PINE : "#1F2A24",
                    fontWeight: r === 0 ? 700 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {row[c] ?? ""}
                </div>
              ))}
            </div>
          ))}
        </div>

        <WatermarkOverlay width={width} height={height} />
        <BrandFooter width={width} />
      </div>
    ),
    { width, height },
  );
  return { png: Buffer.from(await response.arrayBuffer()), width, height };
}
