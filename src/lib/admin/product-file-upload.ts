import "server-only";
import { after } from "next/server";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { displayName, extensionOf } from "@/lib/admin/product-files";
import {
  assignProductCover,
  fixCoverAfterFileChange,
  generateFilePreview,
  type PreviewStatus,
} from "@/lib/admin/product-covers";

/**
 * Operações de arquivo de entrega centralizadas: inserir o registro, gerar o
 * preview/capa e ajustar a capa do produto. Usado pelo fluxo de upload na
 * edição do produto, para não duplicar regra.
 */

export interface RegisterUploadInput {
  productId: string;
  bucket: string;
  path: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  label: string;
}

export type RegisterResult =
  | { ok: true; id: string; previewStatus: PreviewStatus }
  | { ok: false; error: string };

/**
 * Insere o arquivo já armazenado no Storage e AGENDA a geração do preview.
 *
 * O upload NÃO espera a renderização (requisito 17): o preview roda em segundo
 * plano (`after`) e a UI acompanha o status. A geração NUNCA falha o cadastro:
 * se o preview não sair, o arquivo continua salvo e o produto segue válido.
 */
export async function registerUploadedProductFile(
  admin: AdminSupabase,
  input: RegisterUploadInput,
): Promise<RegisterResult> {
  const originalName = displayName(input.originalName);
  const { data, error } = await admin
    .from("product_files")
    .insert({
      product_id: input.productId,
      bucket: input.bucket,
      path: input.path,
      original_name: originalName,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      label: input.label,
      extension: extensionOf(originalName),
      status: "active",
      preview_status: "pending",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: `Não foi possível registrar: ${error?.message ?? "erro"}` };

  const fileId = data.id;
  const { data: product } = await admin.from("products").select("name").eq("id", input.productId).maybeSingle();
  const productName = product?.name ?? "Material digital";

  const run = async () => {
    await generateFilePreview(admin, { fileId, productId: input.productId, productName });
    await assignProductCover(admin, input.productId, { onlyIfUnset: true });
  };

  try {
    after(run); // continua após a resposta; limitado por maxDuration da rota
    return { ok: true, id: fileId, previewStatus: "pending" };
  } catch {
    // Fora de um contexto de requisição (ex.: script): gera de forma síncrona.
    await run();
    return { ok: true, id: fileId, previewStatus: "pending" };
  }
}

export type DeleteResult =
  | { ok: true; productId: string }
  | { ok: false; error: string; soldOrders?: number };

/** Remove o arquivo do Storage e do banco, sempre repontuando a capa. */
export async function deleteProductFile(
  admin: AdminSupabase,
  fileId: string,
  opts: { force?: boolean } = {},
): Promise<DeleteResult> {
  const { data: file } = await admin
    .from("product_files")
    .select("bucket, path, preview_path, product_id")
    .eq("id", fileId)
    .maybeSingle<{ bucket: string; path: string; preview_path: string | null; product_id: string }>();
  if (!file) return { ok: false, error: "Arquivo não encontrado." };

  // §17: se o produto já foi pago, a exclusão definitiva exige confirmação
  // administrativa explícita (force) — nunca quebrar entregas existentes.
  if (!opts.force) {
    const { count } = await admin
      .from("order_items")
      .select("id, orders!inner(payment_status)", { count: "exact", head: true })
      .eq("product_id", file.product_id)
      .in("orders.payment_status", ["confirmed", "received"]);
    const paidOrders = count ?? 0;
    if (paidOrders > 0) {
      return {
        ok: false,
        error: `Este produto tem ${paidOrders} pedido(s) pago(s). Excluir o arquivo remove o acesso de compras existentes.`,
        soldOrders: paidOrders,
      };
    }
  }

  try {
    await admin.storage.from(file.bucket).remove([file.path]);
  } catch {
    /* o registro ainda deve sair mesmo se o objeto já não existir */
  }

  const { error } = await admin.from("product_files").delete().eq("id", fileId);
  if (error) return { ok: false, error: `Não foi possível remover: ${error.message}` };

  await fixCoverAfterFileChange(admin, {
    productId: file.product_id,
    removedFileId: fileId,
    removedPreviewPath: file.preview_path,
  });
  return { ok: true, productId: file.product_id };
}
