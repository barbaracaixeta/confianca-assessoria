/**
 * Regras dos arquivos de entrega dos produtos digitais.
 *
 * Este módulo é importado tanto pelo servidor (Server Actions) quanto pelo
 * cliente (feedback imediato na interface) — por isso NÃO importa nada de
 * servidor. A validação de tamanho/nome é sempre repetida no servidor.
 *
 * A loja aceita QUALQUER formato de arquivo: não há allow-list de extensões.
 * A segurança vem de autenticação, autorização, limite de tamanho, bucket
 * privado, nomes seguros e URLs assinadas.
 */

const MB = 1024 * 1024;

/**
 * Tamanho máximo (em MB) de cada arquivo de entrega. Configurável por
 * NEXT_PUBLIC_MAX_PRODUCT_FILE_SIZE_MB. O bucket "product-files" também
 * precisa permitir este tamanho (ver migração e o limite global do projeto).
 */
export const MAX_PRODUCT_FILE_SIZE_MB = Math.max(
  1,
  Number(process.env.NEXT_PUBLIC_MAX_PRODUCT_FILE_SIZE_MB ?? 50) || 50,
);

export const PRODUCT_MAX_BYTES = MAX_PRODUCT_FILE_SIZE_MB * MB;

export const PRODUCT_FILES_BUCKET = "product-files";

export type ProductFileStatus = "active" | "inactive" | "archived";

export const PRODUCT_FILE_STATUS_LABEL: Record<ProductFileStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  archived: "Arquivado",
};

/** Extensão conhecida → Content-Type sugerido ao Storage. Desconhecidas caem em octet-stream. */
export const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  rtf: "application/rtf",
  epub: "application/epub+zip",
  mobi: "application/x-mobipocket-ebook",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  html: "text/html",
  htm: "text/html",
  json: "application/json",
  xml: "application/xml",
  sql: "application/sql",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  tiff: "image/tiff",
  avif: "image/avif",
  psd: "image/vnd.adobe.photoshop",
  ai: "application/postscript",
  fig: "application/octet-stream",
  sketch: "application/octet-stream",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

/** Extensão normalizada (minúscula, sem ponto) ou "" quando não houver. */
export function extensionOf(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  const ext = base.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,12}$/.test(ext) ? ext : "";
}

/** Nome de exibição: apenas o basename, sem caminho, preservando o original. */
export function displayName(fileName: string): string {
  return (fileName.split(/[\\/]/).pop() ?? fileName).slice(0, 200);
}

/**
 * Nome físico seguro para o Storage: sem caminhos, acentos ou caracteres
 * especiais, com a extensão preservada quando existir. NUNCA usa o nome do
 * usuário como caminho — o caminho sempre leva um UUID.
 */
export function productStorageName(fileName: string): string {
  const base = displayName(fileName);
  const ext = extensionOf(base);
  const stem = ext ? base.slice(0, base.length - ext.length - 1) : base;
  const safe = stem
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const name = safe || "arquivo";
  return ext ? `${name}.${ext}` : name;
}

export function resolveProductFileMime(fileName: string, fallback = "application/octet-stream"): string {
  const lower = fileName.toLowerCase();
  const base = lower.split(/[\\/]/).pop() ?? "";
  const ext = extensionOf(base);
  return EXTENSION_MIME[ext] ?? fallback;
}

export type FileKind =
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "image"
  | "video"
  | "audio"
  | "code"
  | "text"
  | "file";

const EXT_GROUPS: Record<Exclude<FileKind, "pdf" | "file">, string[]> = {
  document: ["doc", "docx", "odt", "rtf", "pages"],
  spreadsheet: ["xls", "xlsx", "ods", "csv", "numbers"],
  presentation: ["ppt", "pptx", "odp", "key"],
  archive: ["zip", "rar", "7z", "tar", "gz", "bz2"],
  image: ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "tiff", "avif", "psd", "ai", "fig", "sketch"],
  video: ["mp4", "mov", "webm", "mkv", "avi"],
  audio: ["mp3", "wav", "ogg", "flac", "m4a"],
  code: ["json", "xml", "sql", "js", "ts", "tsx", "jsx", "html", "htm", "css", "py", "rb", "go", "sh"],
  text: ["txt", "md", "log"],
};

/** Classifica a extensão para escolher o ícone (não bloqueia nada). */
export function fileKind(ext: string): FileKind {
  const e = ext.toLowerCase();
  if (!e) return "file";
  if (e === "pdf") return "pdf";
  for (const [kind, list] of Object.entries(EXT_GROUPS)) {
    if (list.includes(e)) return kind as FileKind;
  }
  return "file";
}

/** Rótulo legível do tipo, usado quando não há extensão. */
export function fileKindLabel(kind: FileKind): string {
  switch (kind) {
    case "pdf":
      return "PDF";
    case "document":
      return "Documento";
    case "spreadsheet":
      return "Planilha";
    case "presentation":
      return "Apresentação";
    case "archive":
      return "Compactado";
    case "image":
      return "Imagem";
    case "video":
      return "Vídeo";
    case "audio":
      return "Áudio";
    case "code":
      return "Código";
    case "text":
      return "Texto";
    default:
      return "Arquivo";
  }
}
