"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductCover, productBundleSize } from "./product-cover";
import { ProductBadge } from "./product-badge";
import { useCart } from "./cart-provider";
import { Button } from "@/components/ui/button";
import { quoteProduct } from "@/lib/pricing";
import { formatMoney, cn } from "@/lib/utils";
import type { Product } from "@/types/domain";

/**
 * Selos reais do produto. Só aparecem quando o dado existe no banco: nenhum
 * selo é inventado para preencher espaço.
 */
function Badges({ product }: { product: Product }) {
  const q = quoteProduct(product);
  const showFeatured = product.isFeatured && !product.isNew && !product.isBestSeller;
  if (!q.promoActive && !product.isNew && !product.isBestSeller && !showFeatured) return null;
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
      {q.promoActive && <ProductBadge tone="discount">{q.percentOff}% OFF</ProductBadge>}
      {product.isNew && <ProductBadge tone="new">NOVO</ProductBadge>}
      {product.isBestSeller && <ProductBadge tone="best">MAIS VENDIDO</ProductBadge>}
      {showFeatured && <ProductBadge tone="featured">DESTAQUE</ProductBadge>}
    </div>
  );
}

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { add, lines } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inCart = lines.some((l) => l.productId === product.id);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const q = quoteProduct(product);
  const bundle = productBundleSize(product);
  const meta = product.categoryName ?? "Material digital";

  function quickAdd() {
    add({ productId: product.id, slug: product.slug, quantity: 1 });
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1600);
  }

  const label = added ? "Adicionado" : inCart ? "No carrinho" : "Adicionar";

  return (
    <article className="group flex h-full flex-col">
      <Link
        href={`/produto/${product.slug}`}
        aria-label={`Ver ${product.name}`}
        className="relative block overflow-hidden rounded-[var(--radius-md)] border border-line bg-green-50 transition-[box-shadow,border-color] duration-300 ease-[var(--ease-out-quart)] group-hover:border-pine/30 group-hover:shadow-md"
      >
        <div className="aspect-[4/5] overflow-hidden">
          <ProductCover
            product={product}
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw"
            className="transition-transform duration-[800ms] ease-[var(--ease-out-quart)] group-hover:scale-[1.03]"
          />
        </div>
        <Badges product={product} />
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="eyebrow text-[0.6875rem] text-muted">{meta}</p>
        <h3 className="mt-2 text-[1.3rem] leading-snug text-ink">
          <Link href={`/produto/${product.slug}`} className="line-clamp-2 transition-colors hover:text-pine">
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto pt-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-sans text-xl font-semibold leading-none tracking-[-0.01em] text-ink tabular">
              {formatMoney(q.totalCents)}
            </span>
            {q.promoActive && (
              <s className="text-sm text-muted tabular">{formatMoney(q.listTotalCents)}</s>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {product.deliveryLabel ?? "Acesso digital após a confirmação"}
            {bundle && <> · {bundle}</>}
          </p>
        </div>

        <Button
          variant={added ? "primary" : "outline"}
          size="sm"
          onClick={quickAdd}
          className={cn("mt-4 w-full", added && "border-pine")}
          aria-label={`Adicionar ${product.name} ao carrinho`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            {added ? (
              <path d="M5 12.5 10 17l9-10" />
            ) : (
              <>
                <path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z" />
                <path d="M9 7V6a3 3 0 0 1 6 0v1" />
              </>
            )}
          </svg>
          {label}
        </Button>
      </div>
    </article>
  );
}
