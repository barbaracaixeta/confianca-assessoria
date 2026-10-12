/**
 * Gera supabase/seed.sql a partir dos dados mockados em src/lib/demo/catalog-data.ts.
 * Uso: npm run seed:generate
 */
import { writeFileSync } from "node:fs";
import { DEMO_CATEGORIES, DEMO_FAQS, DEMO_INSTITUTIONS, DEMO_PRODUCTS } from "../src/lib/demo/catalog-data.ts";

const q = (v: string | null | undefined) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const n = (v: number | null | undefined) => (v == null ? "null" : String(v));
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;

const lines: string[] = [
  "-- ⚠️ DADOS MOCKADOS DE DESENVOLVIMENTO — gerado por scripts/generate-seed.ts. Não edite à mão.",
  "-- Preços e textos são exemplos e devem ser revisados no painel administrativo.",
  "begin;",
];

for (const c of DEMO_CATEGORIES) {
  lines.push(
    `insert into public.categories (id, name, slug, description, sort_order, is_active) values (${q(c.id)}, ${q(c.name)}, ${q(c.slug)}, ${q(c.description)}, ${c.sortOrder}, ${c.isActive}) on conflict (id) do nothing;`,
  );
}

for (const i of DEMO_INSTITUTIONS) {
  lines.push(
    `insert into public.institutions (id, name, slug, description, sort_order, is_active) values (${q(i.id)}, ${q(i.name)}, ${q(i.slug)}, ${q(i.description)}, ${i.sortOrder}, ${i.isActive}) on conflict (id) do nothing;`,
  );
}

for (const p of DEMO_PRODUCTS) {
  lines.push(
    `insert into public.products (id, category_id, institution_id, name, slug, short_description, description, pricing_unit, base_price_cents, discount_type, discount_value, promo_starts_at, promo_ends_at, min_quantity, max_quantity, min_price_cents, max_price_cents, delivery_days, delivery_label, benefits, audience, includes, faqs, is_active, is_featured, sort_order, product_type, is_new, is_best_seller, download_limit) values (${[
      q(p.id),
      q(p.categoryId),
      q(p.institutionId),
      q(p.name),
      q(p.slug),
      q(p.shortDescription),
      q(p.description),
      q(p.pricingUnit),
      n(p.basePriceCents),
      q(p.discountType),
      n(p.discountValue),
      q(p.promoStartsAt),
      q(p.promoEndsAt),
      n(p.minQuantity),
      n(p.maxQuantity),
      n(p.minPriceCents),
      n(p.maxPriceCents),
      n(p.deliveryDays),
      q(p.deliveryLabel),
      j(p.benefits),
      j(p.audience),
      j(p.includes),
      j(p.faqs),
      String(p.isActive),
      String(p.isFeatured),
      n(p.sortOrder),
      q(p.productType),
      String(p.isNew),
      String(p.isBestSeller),
      n(p.downloadLimit),
    ].join(", ")}) on conflict (id) do nothing;`,
  );
  for (const t of p.tiers) {
    lines.push(
      `insert into public.product_prices (product_id, min_quantity, unit_price_cents) values (${q(p.id)}, ${t.minQuantity}, ${t.unitPriceCents}) on conflict (product_id, min_quantity) do nothing;`,
    );
  }
}

DEMO_FAQS.forEach((f, i) => {
  lines.push(
    `insert into public.faqs (question, answer, category, sort_order) select ${q(f.question)}, ${q(f.answer)}, ${q(f.category)}, ${i + 1} where not exists (select 1 from public.faqs where question = ${q(f.question)});`,
  );
});

lines.push(
  "insert into public.coupons (code, description, type, value, starts_at, ends_at, usage_limit, min_order_cents) values ('CONFIANCA10', 'Cupom de exemplo (mock)', 'percent', 10, '2026-10-01T03:00:00Z', '2026-11-01T02:59:59Z', 100, 10000) on conflict (code) do nothing;",
  // Configurações públicas: placeholders vazios — preenchidos pelo admin, nunca inventados.
  `insert into public.site_settings (key, value) values ('public.company', ${j({
    name: "Confiança Assessoria Acadêmica",
    email: null,
    phone: null,
    whatsapp: null,
    address: null,
    cnpj: null,
    instagram: null,
    linkedin: null,
  })}) on conflict (key) do nothing;`,
  `insert into public.site_settings (key, value) values ('public.checkout', ${j({ maxInstallments: 6, minInstallmentCents: 5000, pixExpiresInHours: 24 })}) on conflict (key) do nothing;`,
  "commit;",
);

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), lines.join("\n") + "\n");
console.log(`seed.sql gerado: ${DEMO_CATEGORIES.length} categorias, ${DEMO_INSTITUTIONS.length} instituições, ${DEMO_PRODUCTS.length} produtos, ${DEMO_FAQS.length} FAQs.`);
