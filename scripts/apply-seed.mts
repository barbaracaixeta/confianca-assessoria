/**
 * Aplica os dados mockados de src/lib/demo/catalog-data.ts no projeto Supabase
 * configurado em .env.local, usando a service role key (ignora RLS).
 *
 * É idempotente e aditivo: usa upsert/on conflict do nothing, então rodar de novo
 * não duplica nem sobrescreve dados existentes.
 *
 * Uso: npm run seed:apply
 */
import { createClient } from "@supabase/supabase-js";
import { DEMO_CATEGORIES, DEMO_FAQS, DEMO_INSTITUTIONS, DEMO_PRODUCTS } from "../src/lib/demo/catalog-data.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY. Rode com --env-file=.env.local.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const summary: string[] = [];

async function upsert(table: string, rows: Record<string, unknown>[], onConflict: string) {
  if (rows.length === 0) {
    summary.push(`${table}: 0`);
    return;
  }
  const { error } = await db.from(table).upsert(rows, { onConflict, ignoreDuplicates: true });
  if (error) {
    console.error(`Falha ao inserir em ${table}: ${error.message}`);
    process.exit(1);
  }
  summary.push(`${table}: ${rows.length} enviados`);
}

const categories = DEMO_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  description: c.description,
  sort_order: c.sortOrder,
  is_active: c.isActive,
}));

const institutions = DEMO_INSTITUTIONS.map((i) => ({
  id: i.id,
  name: i.name,
  slug: i.slug,
  description: i.description,
  sort_order: i.sortOrder,
  is_active: i.isActive,
}));

const products = DEMO_PRODUCTS.map((p) => ({
  id: p.id,
  category_id: p.categoryId,
  institution_id: p.institutionId,
  name: p.name,
  slug: p.slug,
  short_description: p.shortDescription,
  description: p.description,
  pricing_unit: p.pricingUnit,
  base_price_cents: p.basePriceCents,
  discount_type: p.discountType,
  discount_value: p.discountValue,
  promo_starts_at: p.promoStartsAt,
  promo_ends_at: p.promoEndsAt,
  min_quantity: p.minQuantity,
  max_quantity: p.maxQuantity,
  min_price_cents: p.minPriceCents,
  max_price_cents: p.maxPriceCents,
  delivery_days: p.deliveryDays,
  delivery_label: p.deliveryLabel,
  benefits: p.benefits,
  audience: p.audience,
  includes: p.includes,
  faqs: p.faqs,
  is_active: p.isActive,
  is_featured: p.isFeatured,
  sort_order: p.sortOrder,
  product_type: p.productType,
  is_new: p.isNew,
  is_best_seller: p.isBestSeller,
  download_limit: p.downloadLimit,
}));

const productPrices = DEMO_PRODUCTS.flatMap((p) =>
  p.tiers.map((t) => ({ product_id: p.id, min_quantity: t.minQuantity, unit_price_cents: t.unitPriceCents })),
);

const coupons = [
  {
    code: "CONFIANCA10",
    description: "Cupom de exemplo (mock)",
    type: "percent",
    value: 10,
    starts_at: "2026-10-01T03:00:00Z",
    ends_at: "2026-11-01T02:59:59Z",
    usage_limit: 100,
    min_order_cents: 10000,
  },
];

const settings = [
  {
    key: "public.company",
    value: { name: "Confiança Assessoria Acadêmica", email: null, phone: null, whatsapp: null, address: null, cnpj: null, instagram: null, linkedin: null },
  },
  { key: "public.checkout", value: { maxInstallments: 6, minInstallmentCents: 5000, pixExpiresInHours: 24 } },
];

console.log(`Aplicando dados mockados em ${url.replace(/^(https:\/\/[a-z0-9]+)\..*/, "$1.supabase.co")} …`);
console.log(`Projeto: ${url}`);

await upsert("categories", categories, "id");
await upsert("institutions", institutions, "id");
await upsert("products", products, "id");
await upsert("product_prices", productPrices, "product_id,min_quantity");
await upsert("coupons", coupons, "code");
await upsert("site_settings", settings, "key");

const { data: existingFaqs, error: faqError } = await db.from("faqs").select("question");
if (faqError) {
  console.error(`Falha ao ler faqs: ${faqError.message}`);
  process.exit(1);
}
const existingQuestions = new Set((existingFaqs ?? []).map((f) => f.question as string));
const newFaqs = DEMO_FAQS.map((f, i) => ({ question: f.question, answer: f.answer, category: f.category, sort_order: i + 1 })).filter(
  (f) => !existingQuestions.has(f.question),
);
if (newFaqs.length > 0) {
  const { error } = await db.from("faqs").insert(newFaqs);
  if (error) {
    console.error(`Falha ao inserir em faqs: ${error.message}`);
    process.exit(1);
  }
}
summary.push(`faqs: ${newFaqs.length} enviados`);

console.log("\nResumo:");
for (const line of summary) console.log(`  - ${line}`);
console.log("Concluído.");
