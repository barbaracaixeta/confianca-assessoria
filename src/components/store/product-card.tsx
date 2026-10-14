"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductCover, productBundleSize } from "./product-cover";
import { ProductBadge } from "./product-badge";
import { useCart } from "./cart-provider";
import { Button } from "@/components/ui/button";
import { quoteProduct } from "@/lib/pricing";
import { formatMoney } from "@/lib/utils";
import type { Product } from "@/types/domain";

function Badges({ product }: { product: Product }) {
  const q = quoteProduct(product);
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
      {q.promoActive && <ProductBadge tone="discount">{q.percentOff}% OFF</ProductBadge>}
      {product.isNew && <ProductBadge tone="new">NOVO</ProductBadge>}
      {product.isBestSeller && <ProductBadge tone="best">MAIS VENDIDO</ProductBadge>}
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
  const meta = [product.categoryName, product.institutionName].filter(Boolean).join(" · ") || "Material digital";

  function quickAdd() {
    add({ productId: product.id, slug: product.slug, quantity: 1 });
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="group flex flex-col">
      <Link
        href={`/produto/${product.slug}`}
        aria-label={`Ver ${product.name}`}
        className="relative block overflow-hidden rounded-[var(--radius-md)] border border-line bg-green-50 transition-[box-shadow,border-color] duration-300 ease-[var(--ease-out-quart)] group-hover:border-pine/30 group-hover:shadow-md"
      >
        <div className="aspect-[4/3] overflow-hidden">
          <ProductCover
            product={product}
            priority={priority}
            className="transition-transform duration-[700ms] ease-[var(--ease-out-quart)] group-hover:scale-[1.04]"
          />
        </div>
        <Badges product={product} />
        <span className="pointer-events-none absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-between gap-2 opacity-0 transition-[opacity,transform] duration-300 ease-[var(--ease-out-quart)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] bg-sheet/95 px-3.5 text-[0.8125rem] font-semibold text-pine shadow-xs backdrop-blur-[2px]">
            Ver produto
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
            </svg>
          </span>
          {bundle && (
            <span className="rounded-[var(--radius-xs)] bg-pine/90 px-2 py-1 text-[10px] font-bold text-paper tabular">
              {bundle}
            </span>
          )}
        </span>
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="eyebrow text-[0.6875rem] text-muted">{meta}</p>
        <h3 className="mt-1.5 text-[1.44rem] leading-snug text-ink">
          <Link href={`/produto/${product.slug}`} className="transition-colors hover:text-pine">
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            {q.promoActive && (
              <p className="text-xs text-muted tabular">
                <s>{formatMoney(q.listTotalCents)}</s>
              </p>
            )}
            <p className="font-sans text-xl font-semibold leading-none tracking-[-0.01em] text-ink tabular">
              {formatMoney(q.totalCents)}
            </p>
          </div>
          <Button
            variant={added ? "primary" : "accent"}
            size="sm"
            onClick={quickAdd}
            aria-label={`Adicionar ${product.name} ao carrinho`}
          >
            {added ? "Adicionado ✓" : inCart ? "No carrinho" : "Adicionar"}
          </Button>
        </div>
      </div>
    </article>
  );
}
