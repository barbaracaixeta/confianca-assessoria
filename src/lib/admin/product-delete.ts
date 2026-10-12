import "server-only";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { PRODUCT_FILES_BUCKET } from "@/lib/admin/product-files";
import { COVER_BUCKET } from "@/lib/admin/product-covers";

export type ProductDeleteResult =
  | { ok: true }
  | { ok: false; error: string; soldOrders?: number };

/**
 * Exclui um produto e limpa o Storage. As tabelas relacionadas caem por cascade
 * (product_files, product_images, preços, promoções, cupons, downloads), e
 * `order_items`/`testimonials` ficam com `product_id = null` para preservar o
 * histórico. Se o produto já foi pago, exige `force` (mesma trava dos arquivos).
 */
export async function deleteProduct(
  admin: AdminSupabase,
  productId: string,
  opts: { force?: boolean } = {},
): Promise<ProductDeleteResult> {
  if (!opts.force) {
    const { count } = await admin
      .from("order_items")
      .select("id, orders!inner(payment_status)", { count: "exact", head: true })
      .eq("product_id", productId)
      .in("orders.payment_status", ["confirmed", "received"]);
    const paidOrders = count ?? 0;
    if (paidOrders > 0) {
      return {
        ok: false,
        error: `Este produto tem ${paidOrders} pedido(s) pago(s). Excluir remove o acesso de compras existentes.`,
        soldOrders: paidOrders,
      };
    }
  }

  const [product, files, images] = await Promise.all([
    admin.from("products").select("image_path").eq("id", productId).maybeSingle(),
    admin.from("product_files").select("bucket, path, preview_path").eq("product_id", productId),
    admin.from("product_images").select("path").eq("product_id", productId),
  ]);

  const removals = new Map<string, Set<string>>();
  const add = (bucket: string, path: string | null | undefined) => {
    if (!path) return;
    if (!removals.has(bucket)) removals.set(bucket, new Set());
    removals.get(bucket)!.add(path);
  };

  add(COVER_BUCKET, product.data?.image_path ?? null);
  for (const f of files.data ?? []) {
    add(f.bucket ?? PRODUCT_FILES_BUCKET, f.path);
    add(COVER_BUCKET, f.preview_path);
  }
  for (const im of images.data ?? []) add(COVER_BUCKET, im.path);

  for (const [bucket, paths] of removals) {
    try {
      await admin.storage.from(bucket).remove([...paths]);
    } catch {
      /* melhor esforço: não impede a exclusão do registro */
    }
  }

  const { error } = await admin.from("products").delete().eq("id", productId);
  if (error) return { ok: false, error: `Não foi possível excluir: ${error.message}` };

  return { ok: true };
}
