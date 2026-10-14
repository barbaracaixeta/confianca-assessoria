import Image from "next/image";
import Link from "next/link";
import { SectionHeader } from "@/components/store/section-header";
import { quoteProduct } from "@/lib/pricing";
import { formatMoney } from "@/lib/utils";
import type { Product } from "@/types/domain";

/**
 * Ranking de mais vendidos. Usa apenas produtos marcados pelo administrador —
 * quando não há nenhum, a seção não é exibida (nunca fingimos números de venda).
 */
export function HomeBestSellers({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="mais-vendidos-titulo" className="border-t border-line bg-sheet">
      <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-28">
        <SectionHeader
          id="mais-vendidos-titulo"
          eyebrow="Mais procurados"
          title="Os mais procurados"
          description="Materiais que estão entre os favoritos da loja."
          href="/loja?mais-vendidos=1"
          linkLabel="Ver todos"
          tone="amber"
        />

        <ol className="mt-12 divide-y divide-line border-t border-line">
          {products.slice(0, 5).map((p, i) => (
            <BestSellerRow key={p.id} product={p} rank={i + 1} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function BestSellerRow({ product, rank }: { product: Product; rank: number }) {
  const q = quoteProduct(product);
  return (
    <li>
      <Link
        href={`/produto/${product.slug}`}
        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 py-5 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto]"
      >
        <span className="font-display font-bold text-2xl text-line-strong tabular transition-colors group-hover:text-amber md:text-3xl">
          {String(rank).padStart(2, "0")}
        </span>
        <span className="relative hidden size-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-line bg-green-50 sm:block">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt="" fill sizes="64px" className="object-contain" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[9px] font-bold tracking-wide text-green">
              {(product.files?.[0]?.originalName.split(".").pop() ?? "DOC").toUpperCase().slice(0, 4)}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block eyebrow text-[0.6875rem] text-muted">
            {[product.categoryName, product.institutionName].filter(Boolean).join(" · ") || "Material digital"}
          </span>
          <span className="mt-1 block truncate font-display font-bold text-[1.3rem] text-ink transition-colors group-hover:text-pine">
            {product.name}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-sans text-lg font-semibold text-ink tabular">{formatMoney(q.totalCents)}</span>
          {q.promoActive && (
            <span className="block text-xs text-muted tabular">
              <s>{formatMoney(q.listTotalCents)}</s>
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
