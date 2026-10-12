import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabasePublicClient, publicStorageUrl } from "@/lib/supabase/public";
import { DEMO_PRODUCTS } from "@/lib/demo/catalog-data";
import { PRODUCT_SELECT, mapProduct, type ProductRow } from "@/lib/catalog/mappers";
import {
  COUPON_REJECTION_MESSAGES,
  cartTotals,
  evaluateCoupon,
  quoteProduct,
  type CartTotals,
  type PriceQuote,
} from "@/lib/pricing";
import type { CartLine, Coupon, Product } from "@/types/domain";

export interface PricedCartLine {
  line: CartLine;
  product: Pick<
    Product,
    | "id"
    | "name"
    | "slug"
    | "shortDescription"
    | "pricingUnit"
    | "minQuantity"
    | "maxQuantity"
    | "deliveryDays"
    | "deliveryLabel"
    | "categoryName"
  >;
  quote: PriceQuote;
}

export interface CouponResult {
  code: string;
  status: "applied" | "rejected";
  message: string;
  couponId?: string;
  discountCents: number;
}

export interface PricedCart {
  lines: PricedCartLine[];
  /** Itens removidos por estarem inativos/inexistentes. */
  removed: CartLine[];
  coupon: CouponResult | null;
  totals: CartTotals;
}

async function loadProducts(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const supabase = createSupabasePublicClient();
  if (!supabase) return DEMO_PRODUCTS.filter((p) => ids.includes(p.id));

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", ids)
    .eq("is_active", true)
    .returns<ProductRow[]>();
  if (error) throw new Error(`Falha ao carregar produtos do carrinho: ${error.message}`);
  return data.map((r) => mapProduct(r, (p) => publicStorageUrl("catalog", p)));
}

interface CouponRow {
  id: string;
  code: string;
  type: Coupon["type"];
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  min_order_cents: number;
  applies_to_all: boolean;
  first_order_only: boolean;
  is_active: boolean;
  coupon_products: { product_id: string }[];
}

export async function loadCoupon(code: string): Promise<Coupon | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("coupons")
    .select("*, coupon_products(product_id)")
    .eq("code", code)
    .maybeSingle<CouponRow>();
  if (!data) return null;
  return {
    id: data.id,
    code: data.code,
    type: data.type,
    value: data.value,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    usageLimit: data.usage_limit,
    perCustomerLimit: data.per_customer_limit,
    minOrderCents: data.min_order_cents,
    appliesToAll: data.applies_to_all,
    firstOrderOnly: data.first_order_only,
    isActive: data.is_active,
    productIds: data.coupon_products.map((cp) => cp.product_id),
  };
}

/**
 * Fonte da verdade de preço: recalcula tudo a partir do banco.
 * `customerId` (quando conhecido) habilita a validação de limite por cliente.
 */
export async function priceCart(lines: CartLine[], couponCode?: string, customerId?: string | null): Promise<PricedCart> {
  const merged = new Map<string, CartLine>();
  for (const l of lines) {
    const prev = merged.get(l.productId);
    merged.set(l.productId, prev ? { ...prev, quantity: Math.max(prev.quantity, l.quantity) } : l);
  }
  const unique = [...merged.values()];
  const products = await loadProducts(unique.map((l) => l.productId));
  const byId = new Map(products.map((p) => [p.id, p]));

  const priced: PricedCartLine[] = [];
  const removed: CartLine[] = [];
  for (const line of unique) {
    const product = byId.get(line.productId);
    if (!product) {
      removed.push(line);
      continue;
    }
    const quote = quoteProduct(product, line.quantity);
    priced.push({
      line: { ...line, quantity: quote.quantity, slug: product.slug },
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription,
        pricingUnit: product.pricingUnit,
        minQuantity: product.minQuantity,
        maxQuantity: product.maxQuantity,
        deliveryDays: product.deliveryDays,
        deliveryLabel: product.deliveryLabel,
        categoryName: product.categoryName,
      },
      quote,
    });
  }

  let coupon: CouponResult | null = null;
  if (couponCode) {
    coupon = await applyCoupon(couponCode, priced, customerId ?? null);
  }

  const totals = cartTotals(
    priced.map((l) => ({ productId: l.product.id, quote: l.quote })),
    coupon?.discountCents ?? 0,
  );
  return { lines: priced, removed, coupon, totals };
}

async function applyCoupon(code: string, lines: PricedCartLine[], customerId: string | null): Promise<CouponResult> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { code, status: "rejected", discountCents: 0, message: "Cupons ficam disponíveis após configurar o Supabase." };
  }
  const coupon = await loadCoupon(code);
  if (!coupon) return { code, status: "rejected", discountCents: 0, message: "Cupom não encontrado." };

  const [{ data: usage }, { count: previousOrders }] = await Promise.all([
    admin.rpc("coupon_usage_count", { p_coupon_id: coupon.id, p_customer_id: customerId }).single<{ total: number; by_customer: number }>(),
    customerId
      ? admin.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", customerId).in("payment_status", ["confirmed", "received"])
      : Promise.resolve({ count: 0 }),
  ]);

  const result = evaluateCoupon(
    coupon,
    lines.map((l) => ({ productId: l.product.id, quote: l.quote })),
    {
      usedTotal: usage?.total ?? 0,
      usedByCustomer: usage?.by_customer ?? 0,
      customerHasPreviousOrders: (previousOrders ?? 0) > 0,
    },
  );

  if (!result.ok) return { code, status: "rejected", discountCents: 0, message: COUPON_REJECTION_MESSAGES[result.reason] };
  return { code, status: "applied", couponId: coupon.id, discountCents: result.discountCents, message: "Cupom aplicado." };
}
