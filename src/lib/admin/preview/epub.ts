import { unzipSync } from "fflate";

/**
 * Extrai a imagem de capa INTERNA de um EPUB (ZIP), seguindo o padrão:
 *   META-INF/container.xml → OPF → manifesto (properties="cover-image" ou
 *   <meta name="cover" content="id">) → arquivo de imagem.
 *
 * Nenhum conteúdo é executado: apenas lemos o ZIP e o XML como texto.
 * Devolve `null` quando o EPUB não tem capa declarada.
 */
export function extractEpubCover(buffer: Buffer): Buffer | null {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buffer));
  } catch {
    return null;
  }

  const names = Object.keys(files);
  const containerPath = names.find((n) => n.toLowerCase() === "meta-inf/container.xml");
  if (!containerPath) return null;

  const container = decode(files[containerPath]);
  const rootfile = container.match(/<rootfile[^>]*full-path=["']([^"']+)["']/i)?.[1];
  if (!rootfile) return null;

  const opfPath = names.find((n) => decodeURIComponent(n) === decodeURIComponent(rootfile)) ?? names.find((n) => n.endsWith(rootfile));
  if (!opfPath) return null;

  const opf = decode(files[opfPath]);
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/")) : "";

  const manifest = parseManifest(opf);
  const coverMetaId = opf.match(/<meta[^>]*name=["']cover["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const coverByProperty = manifest.find((m) => m.properties.includes("cover-image"));

  const coverItem =
    coverByProperty ??
    (coverMetaId ? manifest.find((m) => m.id === coverMetaId) : undefined) ??
    manifest.find((m) => m.id === "cover" && m.mediaType.startsWith("image/"));

  if (!coverItem) return null;

  const href = decodeURIComponent(coverItem.href.split("#")[0]);
  const fullPath = normJoin(opfDir, href);
  const entry = names.find((n) => decodeURIComponent(n) === decodeURIComponent(fullPath)) ?? names.find((n) => n.endsWith(href));
  if (!entry) return null;

  const data = files[entry];
  if (!data || data.byteLength < 32) return null;
  return Buffer.from(data);
}

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties: string;
}

function parseManifest(opf: string): ManifestItem[] {
  const block = opf.match(/<manifest[^>]*>([\s\S]*?)<\/manifest>/i)?.[1] ?? "";
  const items: ManifestItem[] = [];
  const re = /<item\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const attrs = m[1];
    const get = (name: string) => attrs.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] ?? "";
    items.push({ id: get("id"), href: get("href"), mediaType: get("media-type"), properties: get("properties") });
  }
  return items;
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}

function normJoin(dir: string, href: string): string {
  const parts = `${dir}/${href}`.split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "." || p === "") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}
