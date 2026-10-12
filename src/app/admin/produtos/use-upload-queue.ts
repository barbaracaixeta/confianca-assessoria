"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_PRODUCT_FILE_SIZE_MB, PRODUCT_MAX_BYTES } from "@/lib/admin/product-files";
import { formatBytes } from "@/lib/utils";
import { putToSignedUrl, signedUploadUrl } from "./signed-upload";
import { createProductFileUploadUrlAction, confirmProductFileUploadAction, publishProductAction } from "./actions";

export interface UploadItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

/**
 * Fila de upload de arquivos de entrega (qualquer formato): valida o tamanho no
 * cliente, envia direto ao Storage por URL assinada com progresso e confirma no
 * servidor. Usado no painel de Produtos e na edição do produto — mesma regra.
 */
export function useUploadQueue() {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }, []);

  const addFiles = useCallback((list: FileList | File[]) => {
    setMessage(null);
    const incoming = Array.from(list);
    if (incoming.length === 0) return;
    const queued: UploadItem[] = incoming.map((file) => {
      const tooBig = file.size > PRODUCT_MAX_BYTES;
      return {
        id: `u${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: tooBig ? "error" : "pending",
        progress: 0,
        error: tooBig ? `Excede o máximo de ${MAX_PRODUCT_FILE_SIZE_MB} MB (${formatBytes(file.size)}).` : undefined,
      };
    });
    setItems((prev) => [...prev, ...queued]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  async function uploadOne(item: UploadItem, productId: string, label: string): Promise<boolean> {
    patch(item.id, { status: "uploading", progress: 0, error: undefined });

    const ticket = await createProductFileUploadUrlAction({ productId, fileName: item.file.name, sizeBytes: item.file.size });
    if (!ticket.ok) {
      patch(item.id, { status: "error", error: ticket.error });
      return false;
    }
    try {
      await putToSignedUrl(
        signedUploadUrl(ticket.data.supabaseUrl, ticket.data.bucket, ticket.data.path, ticket.data.token),
        item.file,
        (percent) => patch(item.id, { progress: percent }),
      );
    } catch (err) {
      patch(item.id, { status: "error", error: err instanceof Error ? err.message : "Não foi possível enviar ao armazenamento." });
      return false;
    }
    patch(item.id, { progress: 100 });

    const confirmed = await confirmProductFileUploadAction({
      productId,
      path: ticket.data.path,
      originalName: item.file.name,
      label: label.trim() || undefined,
    });
    if (!confirmed.ok) {
      patch(item.id, { status: "error", error: confirmed.error });
      return false;
    }
    patch(item.id, { status: "done" });
    return true;
  }

  async function sendAll(productId: string | null, label: string, opts: { publish?: boolean } = {}) {
    if (!productId) {
      setMessage("Selecione um produto antes de enviar.");
      return;
    }
    const queue = items.filter((it) => it.status !== "done" && it.status !== "error");
    if (queue.length === 0) return;
    setUploading(true);
    setMessage(null);
    let anyDone = false;
    for (const item of queue) {
      if (await uploadOne(item, productId, label)) anyDone = true;
    }
    if (anyDone && opts.publish) {
      const published = await publishProductAction({ productId });
      if (!published.ok) setMessage(published.error);
    }
    setUploading(false);
    if (anyDone) router.refresh();
  }

  const pendingCount = items.filter((it) => it.status === "pending").length;

  return { items, uploading, message, setMessage, addFiles, removeItem, sendAll, pendingCount };
}
