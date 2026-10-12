import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AdminPromotionRow {
  id: string;
  name: string;
  description: string | null;
  bannerPath: string | null;
  discountType: string;
  discountValue: number;
  couponCode: string | null;
  startsAt: string;
  endsAt: string;
  appliesToAll: boolean;
  isActive: boolean;
  createdAt: string;
  productIds: string[];
  productCount: number;
}

export interface AdminPromotionProductOption {
  id: string;
  name: string;
  slug: string;
}

function embeds(value: unknown): Array<Record<string, unknown>> | null {
  if (!value) return null;
  return (Array.isArray(value) ? value : [value]) as Array<Record<string, unknown>>;
}

export async function getAdminPromotions(): Promise<AdminPromotionRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("promotions")
    .select(
      "id, name, description, banner_path, discount_type, discount_value, coupon_code, starts_at, ends_at, applies_to_all, is_active, created_at, promotion_products(product_id)",
    )
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => {
    const productIds = (embeds(p.promotion_products) ?? [])
      .map((r) => r.product_id as string)
      .filter((v): v is string => Boolean(v));
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      bannerPath: p.banner_path,
      discountType: p.discount_type,
      discountValue: p.discount_value,
      couponCode: p.coupon_code,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      appliesToAll: p.applies_to_all,
      isActive: p.is_active,
      createdAt: p.created_at,
      productIds,
      productCount: productIds.length,
    };
  });
}

export async function getPromotionProductOptions(): Promise<AdminPromotionProductOption[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("products")
    .select("id, name, slug")
    .order("name", { ascending: true });
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
  }));
}