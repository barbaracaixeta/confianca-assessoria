/**
 * Tipos de domínio compartilhados entre servidor e cliente.
 * Valores monetários sempre em centavos (inteiros).
 */

export type AppRole = "customer" | "operator" | "admin" | "super_admin";

export type DiscountType = "none" | "percent" | "fixed" | "sale_price";
export type PricingUnit = "fixed" | "per_page";
export type CouponType = "percent" | "fixed";
export type ProductType = "digital" | "physical" | "mixed";

export type OrderStatus =
  | "awaiting_payment"
  | "payment_confirmed"
  | "awaiting_files"
  | "in_analysis"
  | "in_production"
  | "in_review"
  | "awaiting_approval"
  | "delivered"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "confirmed"
  | "received"
  | "overdue"
  | "refused"
  | "refunded"
  | "cancelled";

export type PaymentMethod = "pix" | "credit_card";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Instituição de ensino. Dimensão independente e opcional das categorias. */
export interface Institution {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Instituição com a contagem de produtos ativos vinculados (para listagens). */
export interface InstitutionSummary extends Institution {
  productCount: number;
}

export interface PriceTier {
  minQuantity: number;
  unitPriceCents: number;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** Campos de preço usados pelo motor de cálculo (independente de origem). */
export interface PricingInput {
  pricingUnit: PricingUnit;
  basePriceCents: number;
  discountType: DiscountType;
  discountValue: number;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
  minQuantity: number;
  maxQuantity: number | null;
  minPriceCents: number | null;
  maxPriceCents: number | null;
  tiers: PriceTier[];
}

export interface Product extends PricingInput {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  institutionId: string | null;
  institutionName: string | null;
  institutionSlug: string | null;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  deliveryDays: number;
  deliveryLabel: string | null;
  benefits: string[];
  audience: string[];
  includes: string[];
  faqs: FaqItem[];
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  // Tipo de venda (digital agora; físico/misto preparado)
  productType: ProductType;
  sku: string | null;
  stockQuantity: number | null;
  weightGrams: number | null;
  dimensions: { lengthCm: number; widthCm: number; heightCm: number } | null;
  // Indicações editoriais independentes de preço
  isNew: boolean;
  isBestSeller: boolean;
  downloadLimit: number | null;
  // Arquivos de entrega para produtos digitais
  files: ProductFile[];
}

export interface ProductFile {
  id: string;
  productId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  label: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CartLine {
  productId: string;
  slug: string;
  quantity: number;
  /** Observações do cliente para este serviço (curso, tema, norma). */
  notes?: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  minOrderCents: number;
  appliesToAll: boolean;
  productIds: string[];
  firstOrderOnly: boolean;
  isActive: boolean;
}
