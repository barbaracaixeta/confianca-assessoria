import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicStorageUrl } from "@/lib/supabase/public";
import { DEMO_PRODUCTS } from "@/lib/demo/catalog-data";
import { getStudioSnapshot, type StudioOrderView } from "@/lib/demo/order-studio";
import type { OrderStatus, PaymentStatus } from "@/types/domain";

export interface CustomerOrderRow {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalCents: number;
  createdAt: string;
  dueAt: string | null;
  itemNames: string[];
}

/** Pedidos do cliente logado — o RLS restringe aos pedidos dele. */
export async function getMyOrders(): Promise<CustomerOrderRow[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return getStudioOrders().map(studioOrdersToRow);
  const { data } = await supabase
    .from("orders")
    .select("id, number, status, payment_status, total_cents, created_at, due_at, order_items(product_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    paymentStatus: o.payment_status,
    totalCents: o.total_cents,
    createdAt: o.created_at,
    dueAt: o.due_at,
    itemNames: (o.order_items ?? []).map((i: { product_name: string }) => i.product_name),
  }));
}

export interface CustomerFile {
  id: string;
  originalName: string;
  sizeBytes: number;
  kind: "customer_upload" | "delivery";
  createdAt: string;
  orderId: string | null;
  orderNumber: string | null;
}

export async function getMyFiles(orderId?: string): Promise<CustomerFile[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  let q = supabase
    .from("files")
    .select("id, original_name, size_bytes, kind, created_at, order_files(order_id, orders(number))")
    .in("kind", ["customer_upload", "delivery"])
    .order("created_at", { ascending: false })
    .limit(200);
  if (orderId) q = q.eq("order_files.order_id", orderId);
  const { data } = await q;
  return (data ?? [])
    .map((f) => {
      const link = (f.order_files as unknown as { order_id: string; orders: { number: string } | null }[])?.[0];
      return {
        id: f.id,
        originalName: f.original_name,
        sizeBytes: f.size_bytes,
        kind: f.kind,
        createdAt: f.created_at,
        orderId: link?.order_id ?? null,
        orderNumber: link?.orders?.number ?? null,
      };
    })
    .filter((f) => !orderId || f.orderId === orderId);
}

export async function getOrderMessages(orderId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("messages")
    .select("id, body, is_staff, created_at")
    .eq("order_id", orderId)
    .order("created_at");
  return (data ?? []).map((m) => ({ id: m.id as string, body: m.body as string, isStaff: m.is_staff as boolean, createdAt: m.created_at as string }));
}

export interface PurchasedFile {
  id: string;
  fileName: string;
  fileFormat: string;
  fileSize: number | null;
}

export interface PurchasedProduct {
  productId: string;
  name: string;
  slug: string;
  summary: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  orderNumber: string;
  purchasedAt: string;
  files: PurchasedFile[];
}

/**
 * Produtos digitais comprados pelo cliente logado e já liberados
 * (pagamento confirmado — RLS restringe aos pedidos do próprio cliente).
 */
export async function getMyPurchasedProducts(): Promise<PurchasedProduct[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return getStudioPurchasedProducts();
  const { data } = await supabase
    .from("orders")
    .select(
      "number, created_at, order_items(product_id, product_name, product_slug, products(id, name, slug, short_description, image_path, categories(name), product_files!product_id(id, original_name, mime_type, size_bytes)))",
    )
    .in("payment_status", ["confirmed", "received"])
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  const seen = new Set<string>();
  const products: PurchasedProduct[] = [];
  for (const o of data ?? []) {
    const items = o.order_items as unknown as Record<string, unknown>[] | null;
    for (const i of items ?? []) {
      const product = i.products as unknown as {
        id: string;
        name: string;
        slug: string;
        short_description: string | null;
        image_path: string | null;
        categories: { name: string }[] | null;
        product_files: { id: string; original_name: string; mime_type: string; size_bytes: number | null }[] | null;
      };
      if (!product || seen.has(product.id)) continue;
      seen.add(product.id);
      products.push({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        summary: product.short_description,
        categoryName: product.categories?.[0]?.name ?? null,
        imageUrl: product.image_path ? publicStorageUrl("catalog", product.image_path) : null,
        orderNumber: o.number,
        purchasedAt: o.created_at,
        files: (product.product_files ?? []).map((f) => ({
          id: f.id,
          fileName: f.original_name,
          fileFormat: f.mime_type,
          fileSize: f.size_bytes,
        })),
      });
    }
  }
  return products;
}

// ---------------------------------------------------------------------------
// Demonstração (sem Supabase): espelha os resultados usando o Order Studio.
// ---------------------------------------------------------------------------

function getStudioOrders(): StudioOrderView[] {
  return getStudioSnapshot().orders;
}

function studioOrdersToRow(o: StudioOrderView): CustomerOrderRow {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    paymentStatus: o.paymentStatus,
    totalCents: o.totalCents,
    createdAt: o.createdAt,
    dueAt: null,
    itemNames: o.productName ? [o.productName] : [],
  };
}

function getStudioPurchasedProducts(): PurchasedProduct[] {
  const seen = new Set<string>();
  const products: PurchasedProduct[] = [];
  for (const o of getStudioSnapshot().orders) {
    if (!o.downloadAllowed) continue;
    const product = DEMO_PRODUCTS.find((p) => p.slug === o.productSlug);
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    products.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      summary: product.shortDescription,
      categoryName: product.categoryName,
      imageUrl: product.imageUrl,
      orderNumber: o.number,
      purchasedAt: o.createdAt,
      files: product.files.map((f) => ({
        id: f.id,
        fileName: f.originalName,
        fileFormat: f.mimeType,
        fileSize: f.sizeBytes,
      })),
    });
  }
  return products;
}
