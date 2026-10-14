import { ButtonLink } from "@/components/ui/button";
import { ProductCover } from "@/components/store/product-cover";
import type { Product } from "@/types/domain";

const TRUST = ["Compra segura", "Acesso digital", "Arquivos protegidos"];

/**
 * Herói editorial. A arte da direita é composta com as capas reais do catálogo —
 * nenhuma imagem falsa é criada. Sem produtos com capa, cai para o motivo da marca.
 */
export function Hero({
  products,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
}: {
  products: Product[];
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_92%_-15%,var(--color-green-100)_0%,transparent_58%)]"
      />
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-14 px-5 pt-16 pb-20 md:px-8 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:gap-20 lg:pt-24 lg:pb-28">
        <div className="reveal max-w-[38rem]">
          <p className="eyebrow text-green">Materiais acadêmicos digitais</p>
          <h1 className="display mt-5 text-[2.6rem] text-pine sm:text-[3.3rem] lg:text-[4rem]">{title}</h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-2">{subtitle}</p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <ButtonLink href={ctaHref} size="lg">
              {ctaLabel}
            </ButtonLink>
            <ButtonLink href="/loja?mais-vendidos=1" variant="outline" size="lg">
              Ver mais vendidos
            </ButtonLink>
          </div>

          <ul className="mt-12 flex max-w-[34rem] flex-wrap gap-x-7 gap-y-3 border-t border-line pt-6 text-sm text-muted">
            {TRUST.map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <svg viewBox="0 0 16 16" className="size-4 text-green" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M3 8.5 6.5 12 13 4.5" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <HeroGallery products={products} />
      </div>
    </section>
  );
}

function HeroCoverTile({
  product,
  className,
  priority = false,
}: {
  product: Product;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-md)] border border-line bg-green-50 shadow-md ${className ?? ""}`}>
      <ProductCover product={product} priority={priority} sizes="(min-width: 1024px) 20vw, 40vw" />
    </div>
  );
}

/**
 * Estante editorial de capas reais: a do meio é a protagonista, as laterais
 * formam a coleção. Composição flexível — nunca cria imagem falsa.
 */
function HeroGallery({ products }: { products: Product[] }) {
  const tiles = products.slice(0, 3);

  if (tiles.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[26rem] lg:mr-0">
        <HeroCoverTile product={EMPTY_PRODUCT} className="aspect-[3/4] w-[68%] mx-auto" />
      </div>
    );
  }

  if (tiles.length === 1) {
    return (
      <div className="mx-auto w-full max-w-[26rem] lg:mr-0">
        <HeroCoverTile product={tiles[0]} priority className="aspect-[3/4] w-[72%] mx-auto" />
      </div>
    );
  }

  if (tiles.length === 2) {
    return (
      <div className="mx-auto flex w-full max-w-[30rem] items-end justify-center gap-5 lg:mr-0">
        <HeroCoverTile product={tiles[0]} priority className="aspect-[3/4] w-[50%]" />
        <HeroCoverTile product={tiles[1]} className="aspect-[3/4] w-[42%]" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[31rem] items-end justify-center gap-4 lg:mr-0">
      <HeroCoverTile product={tiles[0]} priority className="aspect-[3/4] w-[26%]" />
      <HeroCoverTile product={tiles[1]} priority className="aspect-[3/4] w-[40%]" />
      <HeroCoverTile product={tiles[2]} className="aspect-[3/4] w-[26%]" />
    </div>
  );
}

/** Produto vazio só para desenhar o motivo de marca quando o catálogo não tem capas. */
const EMPTY_PRODUCT: Product = {
  id: "placeholder",
  categoryId: null,
  categoryName: null,
  institutionId: null,
  institutionName: null,
  institutionSlug: null,
  name: "Materiais acadêmicos digitais",
  slug: "",
  shortDescription: "",
  description: "",
  deliveryDays: 0,
  deliveryLabel: null,
  benefits: [],
  audience: [],
  includes: [],
  faqs: [],
  imageUrl: null,
  isActive: true,
  isFeatured: false,
  sortOrder: 0,
  seoTitle: null,
  seoDescription: null,
  productType: "digital",
  sku: null,
  stockQuantity: null,
  weightGrams: null,
  dimensions: null,
  isNew: false,
  isBestSeller: false,
  downloadLimit: null,
  files: [],
  pricingUnit: "fixed",
  basePriceCents: 0,
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
