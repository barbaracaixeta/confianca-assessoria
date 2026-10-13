import { ImageResponse } from "next/og";
import { fileKind, fileKindLabel } from "@/lib/admin/product-files";

/** Paleta institucional (mesma do restante do produto). */
export const PINE = "#0B5139";
export const GREEN = "#147A55";
export const AMBER = "#F28C28";
export const AMBER_LIGHT = "#FFB45C";
export const PAPER = "#F8FAF8";

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
 * Capa institucional editorial (1200x900, PNG) usada como FALLBACK — para
 * formatos que não conseguimos renderizar (DOCX/PPTX/ZIP/…) ou quando a
 * renderização da primeira página falha. Nunca usa fontes externas: o
 * `next/og` traz a fonte padrão embutida.
 */
export async function buildCoverPng(input: CoverInput): Promise<Buffer> {
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
  return Buffer.from(await response.arrayBuffer());
}
