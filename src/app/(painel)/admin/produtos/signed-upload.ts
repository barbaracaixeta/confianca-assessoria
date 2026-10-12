"use client";

/**
 * Upload direto ao Storage do Supabase via URL assinada (PUT + XHR).
 * Evita passar o arquivo pelo corpo da Server Action — funciona para arquivos
 * grandes (até o limite do bucket) e permite progresso por arquivo.
 */

export function signedUploadUrl(base: string, bucket: string, path: string, token: string): string {
  const normalized = base.replace(/\/$/, "");
  return `${normalized}/storage/v1/object/upload/sign/${bucket}/${path}?token=${encodeURIComponent(token)}`;
}

export function putToSignedUrl(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Falha no envio (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Falha de rede durante o envio."));
    xhr.onabort = () => reject(new Error("Envio cancelado."));
    xhr.send(file);
  });
}
