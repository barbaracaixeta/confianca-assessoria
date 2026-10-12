import type { Category, FaqItem, Product, ProductFile, ProductType } from "@/types/domain";

export interface ProductRow {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  pricing_unit: Product["pricingUnit"];
  base_price_cents: number;
  discount_type: Product["discountType"];
  discount_value: number;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
  min_quantity: number;
  max_quantity: number | null;
  min_price_cents: number | null;
  max_price_cents: number | null;
  delivery_days: number;
  delivery_label: string | null;
  benefits: unknown;
  audience: unknown;
  includes: unknown;
  faqs: unknown;
  image_path: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  product_type: ProductType;
  sku: string | null;
  stock_quantity: number | null;
  weight_grams: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  is_new: boolean;
  is_best_seller: boolean;
  download_limit: number | null;
  categories?: { name: string } | null;
  product_prices?: { min_quantity: number; unit_price_cents: number }[] | null;
  product_files?: ProductFileRow[] | null;
}

export interface ProductFileRow {
  id: string;
  product_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  label: string | null;
  sort_order: number;
  created_at: string;
}

export const PRODUCT_SELECT =
  "*, categories(name), product_prices(min_quantity, unit_price_cents), product_files!product_id(id, original_name, mime_type, size_bytes, label, sort_order, created_at)";

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

const faqs = (v: unknown): FaqItem[] =>
  Array.isArray(v)
    ? v.filter(
        (x): x is FaqItem =>
          typeof x === "object" && x !== null && typeof x.question === "string" && typeof x.answer === "string",
      )
    : [];

export function mapProduct(row: ProductRow, imageUrl: (path: string | null) => string | null): Product {
  const dimensions =
    row.length_cm != null && row.width_cm != null && row.height_cm != null
      ? { lengthCm: row.length_cm, widthCm: row.width_cm, heightCm: row.height_cm }
      : null;
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    pricingUnit: row.pricing_unit,
    basePriceCents: row.base_price_cents,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    promoStartsAt: row.promo_starts_at,
    promoEndsAt: row.promo_ends_at,
    minQuantity: row.min_quantity,
    maxQuantity: row.max_quantity,
    minPriceCents: row.min_price_cents,
    maxPriceCents: row.max_price_cents,
    tiers: (row.product_prices ?? []).map((t) => ({ minQuantity: t.min_quantity, unitPriceCents: t.unit_price_cents })),
    deliveryDays: row.delivery_days,
    deliveryLabel: row.delivery_label,
    benefits: strings(row.benefits),
    audience: strings(row.audience),
    includes: strings(row.includes),
    faqs: faqs(row.faqs),
    imageUrl: imageUrl(row.image_path),
    isActive: row.is_active,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    productType: row.product_type,
    sku: row.sku,
    stockQuantity: row.stock_quantity,
    weightGrams: row.weight_grams,
    dimensions,
    isNew: row.is_new,
    isBestSeller: row.is_best_seller,
    downloadLimit: row.download_limit,
    files: (row.product_files ?? []).map((f) => mapProductFile(f)),
  };
}

export function mapProductFile(row: ProductFileRow): ProductFile {
  return {
    id: row.id,
    productId: row.product_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    label: row.label,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}
