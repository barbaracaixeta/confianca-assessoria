import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/supabase/public";

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  institution: string | null;
  basePriceCents: number;
  discountType: string;
  discountValue: number;
  promoActive: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  productType: string;
  coverUrl: string | null;
  fileCount: number;
  orderCount: number;
}

export interface AdminCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface AdminInstitutionRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoPath: string | null;
  logoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface AdminCouponRow {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  endsAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
}

const now = new Date();

function embeds(value: unknown): Array<Record<string, unknown>> | null {
  if (!value) return null;
  return (Array.isArray(value) ? value : [value]) as Array<Record<string, unknown>>;
}

export async function getAdminProducts(): Promise<AdminProductRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("products")
    .select(
      "id, name, slug, product_type, base_price_cents, discount_type, discount_value, promo_starts_at, promo_ends_at, is_active, is_featured, is_new, is_best_seller, image_path, categories(name), institutions(name), product_files!product_id(id), order_items(id)",
    )
    .order("sort_order", { ascending: true, nullsFirst: false });
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: (embeds(p.categories)?.[0]?.name as string | undefined) ?? null,
    institution: (embeds(p.institutions)?.[0]?.name as string | undefined) ?? null,
    basePriceCents: p.base_price_cents,
    discountType: p.discount_type,
    discountValue: p.discount_value,
    promoActive: Boolean(
      p.discount_type !== "none" &&
        (!p.promo_starts_at || new Date(p.promo_starts_at) <= now) &&
        (!p.promo_ends_at || new Date(p.promo_ends_at) > now),
    ),
    isActive: p.is_active,
    isFeatured: p.is_featured,
    isNew: p.is_new,
    isBestSeller: p.is_best_seller,
    productType: p.product_type,
    coverUrl: publicStorageUrl("catalog", p.image_path),
    fileCount: (embeds(p.product_files) ?? []).length,
    orderCount: (embeds(p.order_items) ?? []).length,
  }));
}

export async function getAdminCategories(): Promise<AdminCategoryRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("categories")
    .select("id, name, slug, description, sort_order, is_active, products(id)")
    .order("sort_order", { ascending: true });
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    sortOrder: c.sort_order,
    isActive: c.is_active,
    productCount: (embeds(c.products) ?? []).length,
  }));
}

export async function getAdminInstitutions(): Promise<AdminInstitutionRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("institutions")
    .select("id, name, slug, description, logo_path, sort_order, is_active, products(id)")
    .order("sort_order", { ascending: true });
  return (data ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    slug: i.slug,
    description: i.description,
    logoPath: i.logo_path,
    logoUrl: publicStorageUrl("catalog", i.logo_path),
    sortOrder: i.sort_order,
    isActive: i.is_active,
    productCount: (embeds(i.products) ?? []).length,
  }));
}

export async function getAdminCoupons(): Promise<AdminCouponRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("coupons")
    .select("id, code, description, type, value, ends_at, usage_limit, is_active, orders(id)")
    .order("created_at", { ascending: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    type: c.type,
    value: c.value,
    endsAt: c.ends_at,
    usageLimit: c.usage_limit,
    usageCount: (embeds(c.orders) ?? []).length,
    isActive: c.is_active,
  }));
}