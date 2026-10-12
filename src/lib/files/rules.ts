/** Regras de upload compartilhadas entre navegador (feedback imediato) e servidor (autoridade). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_UPLOADS: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const ACCEPT_ATTR = Object.keys(ALLOWED_UPLOADS).map((e) => `.${e}`).join(",");

export function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function validateUpload(name: string, size: number): string | null {
  const ext = extensionOf(name);
  if (!ALLOWED_UPLOADS[ext]) return "Formato não aceito. Envie DOCX, PDF, XLSX, PPTX ou imagens (PNG, JPG, WEBP).";
  if (size <= 0) return "O arquivo está vazio.";
  if (size > MAX_UPLOAD_BYTES) return "O arquivo passa de 25 MB. Compacte ou divida em partes.";
  return null;
}

/** Nome seguro para armazenamento: sem caminhos, acentos ou caracteres especiais. */
export function storageSafeName(name: string): string {
  const ext = extensionOf(name);
  const base = name
    .slice(0, name.length - ext.length - 1)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "arquivo"}.${ext}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
