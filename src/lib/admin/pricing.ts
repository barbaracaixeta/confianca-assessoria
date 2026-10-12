import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PricingUnit } from "@/types/domain";

export interface AdminPriceTierRow {
  id: string;
  productId: string;
  minQuantity: number;
  unitPriceCents: number;
  createdAt: string;
}

export interface AdminPricingProduct {
  id: string;
  name: string;
  slug: string;
  pricingUnit: PricingUnit;
}

export async function getAdminPriceTiers(productId: string): Promise<AdminPriceTierRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("product_prices")
    .select("id, product_id, min_quantity, unit_price_cents, created_at")
    .eq("product_id", productId)
    .order("min_quantity", { ascending: true });
  return (data ?? []).map((t) => ({
    id: t.id,
    productId: t.product_id,
    minQuantity: t.min_quantity,
    unitPriceCents: t.unit_price_cents,
    createdAt: t.created_at,
  }));
}

export async function getPricingProducts(): Promise<AdminPricingProduct[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("products")
    .select("id, name, slug, pricing_unit")
    .order("name", { ascending: true });
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    pricingUnit: p.pricing_unit,
  }));
}