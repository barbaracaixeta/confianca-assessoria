import ExcelJS from "exceljs";

const MAX_ROWS = 28;
const MAX_COLS = 10;

/** Valor de célula → texto legível (nunca executa fórmulas). */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "VERDADEIRO" : "FALSO";
  if (value instanceof Date) return value.toLocaleDateString("pt-BR");
  if (typeof value === "object") {
    const v = value as unknown as Record<string, unknown>;
    if (Array.isArray(v.richText)) return (v.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v) return cellToString(v.result as ExcelJS.CellValue);
    if ("hyperlink" in v && typeof v.hyperlink === "string") return String(v.text ?? v.hyperlink);
  }
  return "";
}

/**
 * Lê a primeira worksheet e devolve a primeira área útil como matriz de texto
 * (limitada em linhas/colunas) para desenhar o preview. `null` se não houver
 * nada utilizável.
 */
export async function readFirstSheet(buffer: Buffer): Promise<{ sheetName: string; rows: string[][] } | null> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    return null;
  }

  const ws = wb.worksheets[0];
  if (!ws) return null;

  const rowCount = Math.min(ws.rowCount, MAX_ROWS);
  const colCount = Math.min(ws.columnCount, MAX_COLS);
  if (rowCount < 1 || colCount < 1) return null;

  const rows: string[][] = [];
  let hasContent = false;
  for (let r = 1; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const cells: string[] = [];
    for (let c = 1; c <= colCount; c++) {
      const text = cellToString(row.getCell(c).value).slice(0, 60);
      if (text) hasContent = true;
      cells.push(text);
    }
    rows.push(cells);
  }

  if (!hasContent) return null;
  return { sheetName: ws.name || "Planilha 1", rows };
}
