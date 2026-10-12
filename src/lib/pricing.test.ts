import { describe, expect, it } from "vitest";
import { cartTotals, evaluateCoupon, installmentOptions, quoteProduct } from "./pricing";
import type { Coupon, PricingInput } from "@/types/domain";

const base: PricingInput = {
  pricingUnit: "fixed",
  basePriceCents: 19990,
  discountType: "none",
  discountValue: 0,
  promoStartsAt: null,
  promoEndsAt: null,
  minQuantity: 1,
  maxQuantity: null,
  minPriceCents: null,
  maxPriceCents: null,
  tiers: [],
};

const coupon: Coupon = {
  id: "c1",
  code: "CONFIANCA10",
  type: "percent",
  value: 10,
  startsAt: "2026-10-01T03:00:00Z",
  endsAt: "2026-11-01T02:59:59Z",
  usageLimit: 100,
  perCustomerLimit: null,
  minOrderCents: 10000,
  appliesToAll: true,
  productIds: [],
  firstOrderOnly: false,
  isActive: true,
};

const now = new Date("2026-10-10T15:00:00Z");

describe("quoteProduct", () => {
  it("sem promoção mantém o preço", () => {
    const q = quoteProduct(base, 1, now);
    expect(q.totalCents).toBe(19990);
    expect(q.percentOff).toBe(0);
    expect(q.promoActive).toBe(false);
  });

  it("preço promocional calcula o percentual automaticamente", () => {
    const q = quoteProduct({ ...base, discountType: "sale_price", discountValue: 14990 }, 1, now);
    expect(q.totalCents).toBe(14990);
    expect(q.percentOff).toBe(25);
  });

  it("desconto percentual", () => {
    const q = quoteProduct({ ...base, discountType: "percent", discountValue: 20 }, 1, now);
    expect(q.totalCents).toBe(15992);
    expect(q.percentOff).toBe(20);
  });

  it("promoção fora da janela não se aplica", () => {
    const q = quoteProduct(
      { ...base, discountType: "percent", discountValue: 20, promoEndsAt: "2026-10-01T00:00:00Z" },
      1,
      now,
    );
    expect(q.totalCents).toBe(19990);
    expect(q.promoActive).toBe(false);
  });

  it("preço por página usa a faixa e respeita mínimo/máximo", () => {
    const perPage: PricingInput = {
      ...base,
      pricingUnit: "per_page",
      basePriceCents: 500,
      minQuantity: 10,
      maxQuantity: 300,
      minPriceCents: 6000,
      tiers: [{ minQuantity: 50, unitPriceCents: 400 }],
    };
    expect(quoteProduct(perPage, 3, now).quantity).toBe(10);
    expect(quoteProduct(perPage, 10, now).totalCents).toBe(6000);
    expect(quoteProduct(perPage, 60, now).totalCents).toBe(24000);
    expect(quoteProduct(perPage, 999, now).quantity).toBe(300);
  });
});

describe("cupons", () => {
  const lines = [
    { productId: "a", quote: quoteProduct(base, 1, now) },
    { productId: "b", quote: quoteProduct(base, 1, now) },
  ];
  const ctx = { usedTotal: 0, usedByCustomer: 0, customerHasPreviousOrders: false, now };

  it("aplica 10% sobre R$ 399,80", () => {
    const r = evaluateCoupon(coupon, lines, ctx);
    expect(r).toEqual({ ok: true, discountCents: 3998, eligibleSubtotalCents: 39980 });
    if (r.ok) expect(cartTotals(lines, r.discountCents)).toEqual({ subtotalCents: 39980, discountCents: 3998, totalCents: 35982 });
  });

  it("valida validade, limite e valor mínimo", () => {
    expect(evaluateCoupon(coupon, lines, { ...ctx, now: new Date("2026-11-05T00:00:00Z") })).toEqual({ ok: false, reason: "expired" });
    expect(evaluateCoupon(coupon, lines, { ...ctx, usedTotal: 100 })).toEqual({ ok: false, reason: "usage_limit" });
    expect(evaluateCoupon({ ...coupon, minOrderCents: 50000 }, lines, ctx)).toEqual({ ok: false, reason: "min_order" });
    expect(evaluateCoupon({ ...coupon, isActive: false }, lines, ctx)).toEqual({ ok: false, reason: "inactive" });
  });

  it("restringe a produtos selecionados", () => {
    const r = evaluateCoupon({ ...coupon, appliesToAll: false, productIds: ["b"] }, lines, ctx);
    expect(r).toEqual({ ok: true, discountCents: 1999, eligibleSubtotalCents: 19990 });
  });

  it("valor fixo nunca excede o elegível", () => {
    const r = evaluateCoupon({ ...coupon, type: "fixed", value: 999999 }, lines, ctx);
    expect(r.ok && r.discountCents).toBe(39980);
  });
});

describe("parcelas", () => {
  it("respeita parcela mínima", () => {
    expect(installmentOptions(12000, 6, 5000).map((o) => o.count)).toEqual([1, 2]);
  });
});
