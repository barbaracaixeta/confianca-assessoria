import type { Coupon, PricingInput } from "@/types/domain";

/**
 * Motor de preços — funções puras, usadas no navegador (exibição) e no servidor
 * (fonte da verdade no checkout). O servidor sempre recalcula a partir do banco.
 */

export interface PriceQuote {
  quantity: number;
  /** Preço unitário de tabela (já considerando faixas por quantidade). */
  listUnitCents: number;
  /** Preço unitário efetivo após promoção. */
  unitCents: number;
  listTotalCents: number;
  totalCents: number;
  savingsCents: number;
  /** Percentual exibido no selo "X% OFF" (0 quando não há desconto). */
  percentOff: number;
  promoActive: boolean;
  /** O valor mínimo do produto foi aplicado ao total. */
  minApplied: boolean;
}

export function isWithinWindow(
  startsAt: string | null,
  endsAt: string | null,
  now: Date = new Date(),
): boolean {
  const t = now.getTime();
  if (startsAt && t < new Date(startsAt).getTime()) return false;
  if (endsAt && t > new Date(endsAt).getTime()) return false;
  return true;
}

export function clampQuantity(p: Pick<PricingInput, "minQuantity" | "maxQuantity">, quantity: number): number {
  const q = Number.isFinite(quantity) ? Math.floor(quantity) : p.minQuantity;
  const lower = Math.max(1, p.minQuantity);
  const upper = p.maxQuantity ?? Number.MAX_SAFE_INTEGER;
  return Math.min(Math.max(q, lower), upper);
}

function tierUnitPrice(p: PricingInput, quantity: number): number {
  const applicable = p.tiers
    .filter((t) => t.minQuantity <= quantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];
  return applicable ? applicable.unitPriceCents : p.basePriceCents;
}

function discountedUnit(p: PricingInput, listUnit: number): number {
  switch (p.discountType) {
    case "percent":
      return Math.round(listUnit * (1 - Math.min(p.discountValue, 100) / 100));
    case "fixed":
      return Math.max(0, listUnit - p.discountValue);
    case "sale_price":
      return Math.min(listUnit, p.discountValue);
    default:
      return listUnit;
  }
}

export function quoteProduct(p: PricingInput, quantity = p.minQuantity, now: Date = new Date()): PriceQuote {
  const q = clampQuantity(p, quantity);
  const listUnitCents = tierUnitPrice(p, q);
  const promoActive = p.discountType !== "none" && isWithinWindow(p.promoStartsAt, p.promoEndsAt, now);
  const unitCents = promoActive ? discountedUnit(p, listUnitCents) : listUnitCents;

  const listTotalCents = listUnitCents * q;
  let totalCents = unitCents * q;
  const minApplied = p.minPriceCents != null && totalCents < p.minPriceCents;
  if (p.minPriceCents != null) totalCents = Math.max(totalCents, p.minPriceCents);
  if (p.maxPriceCents != null) totalCents = Math.min(totalCents, p.maxPriceCents);

  const savingsCents = Math.max(0, listTotalCents - totalCents);
  const percentOff = listTotalCents > 0 ? Math.round((savingsCents / listTotalCents) * 100) : 0;

  return {
    quantity: q,
    listUnitCents,
    unitCents,
    listTotalCents,
    totalCents,
    savingsCents,
    percentOff,
    promoActive: promoActive && savingsCents > 0,
    minApplied,
  };
}

// ---------------------------------------------------------------------
// Carrinho e cupons
// ---------------------------------------------------------------------

export interface PricedLine {
  productId: string;
  quote: PriceQuote;
}

export type CouponRejection =
  | "inactive"
  | "not_started"
  | "expired"
  | "usage_limit"
  | "customer_limit"
  | "min_order"
  | "no_eligible_items"
  | "first_order_only";

export const COUPON_REJECTION_MESSAGES: Record<CouponRejection, string> = {
  inactive: "Este cupom não está disponível.",
  not_started: "Este cupom ainda não está válido.",
  expired: "Este cupom expirou.",
  usage_limit: "Este cupom atingiu o limite de utilizações.",
  customer_limit: "Você já utilizou este cupom o número máximo de vezes.",
  min_order: "O valor mínimo do pedido para este cupom não foi atingido.",
  no_eligible_items: "Nenhum produto do carrinho é elegível para este cupom.",
  first_order_only: "Este cupom é válido apenas para o primeiro pedido.",
};

export interface CouponContext {
  usedTotal: number;
  usedByCustomer: number;
  customerHasPreviousOrders: boolean;
  now?: Date;
}

export type CouponEvaluation =
  | { ok: true; discountCents: number; eligibleSubtotalCents: number }
  | { ok: false; reason: CouponRejection };

export function evaluateCoupon(coupon: Coupon, lines: PricedLine[], ctx: CouponContext): CouponEvaluation {
  const now = ctx.now ?? new Date();
  if (!coupon.isActive) return { ok: false, reason: "inactive" };
  if (coupon.startsAt && now < new Date(coupon.startsAt)) return { ok: false, reason: "not_started" };
  if (coupon.endsAt && now > new Date(coupon.endsAt)) return { ok: false, reason: "expired" };
  if (coupon.usageLimit != null && ctx.usedTotal >= coupon.usageLimit) return { ok: false, reason: "usage_limit" };
  if (coupon.perCustomerLimit != null && ctx.usedByCustomer >= coupon.perCustomerLimit) {
    return { ok: false, reason: "customer_limit" };
  }
  if (coupon.firstOrderOnly && ctx.customerHasPreviousOrders) return { ok: false, reason: "first_order_only" };

  const subtotal = lines.reduce((sum, l) => sum + l.quote.totalCents, 0);
  if (subtotal < coupon.minOrderCents) return { ok: false, reason: "min_order" };

  const eligible = coupon.appliesToAll
    ? subtotal
    : lines.filter((l) => coupon.productIds.includes(l.productId)).reduce((s, l) => s + l.quote.totalCents, 0);
  if (eligible <= 0) return { ok: false, reason: "no_eligible_items" };

  const raw = coupon.type === "percent" ? Math.round((eligible * coupon.value) / 100) : coupon.value;
  return { ok: true, discountCents: Math.min(raw, eligible), eligibleSubtotalCents: eligible };
}

export interface CartTotals {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export function cartTotals(lines: PricedLine[], couponDiscountCents = 0): CartTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.quote.totalCents, 0);
  const discountCents = Math.min(Math.max(0, couponDiscountCents), subtotalCents);
  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}

/** Parcelas sem juros para cartão: respeita parcela mínima configurável. */
export function installmentOptions(totalCents: number, maxInstallments = 6, minInstallmentCents = 5000) {
  const options: { count: number; valueCents: number }[] = [];
  for (let n = 1; n <= maxInstallments; n++) {
    const value = Math.ceil(totalCents / n);
    if (n > 1 && value < minInstallmentCents) break;
    options.push({ count: n, valueCents: value });
  }
  return options;
}
