"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductCover, productBundleSize } from "./product-cover";
import { useCart } from "./cart-provider";
import { Button } from "@/components/ui/button";
import { quoteProduct } from "@/lib/pricing";
import { formatMoney } from "@/lib/utils";
import type { Product } from "@/types/domain";
import { cn } from "@/lib/utils";

function Badges({ product }: { product: Product }) {
  const q = quoteProduct(product);
  const badges: { label: string; className: string }[] = [];
  if (q.promoActive) badges.push({ label: `${q.percentOff}% OFF`, className: "bg-amber text-pine-900" });
  if (product.isNew) badges.push({ label: "NOVO", className: "bg-pine text-paper" });
  if (product.isBestSeller) badges.push({ label: "MAIS VENDIDO", className: "bg-ink text-paper" });
  return (
    <div className="pointer-events-none absolute top-2.5 left-2.5 z-10 flex max-w-[calc(100%-2.5rem)] flex-wrap gap-1.5">
      {badges.map((b) => (
        <span key={b.label} className={cn("rounded-[var(--radius-xs)] px-2 py-0.5 text-[11px] font-bold tracking-wide tabular", b.className)}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add, lines } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inCart = lines.some((l) => l.productId === product.id);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const q = quoteProduct(product);
  const bundle = productBundleSize(product);
  const delivery = product.productType === "digital" ? "Entregue na hora" : product.deliveryLabel ?? "Entrega física";

  function quickAdd() {
    add({ productId: product.id, slug: product.slug, quantity: 1 });
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-line bg-sheet transition-[border-color,transform] duration-300 hover:border-pine/40">
      <Link href={`/produto/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-green-50">
        <Badges product={product} />
        <ProductCover product={product} className="transition-transform duration-500 ease-[var(--ease-out-quart)] group-hover:scale-[1.03]" />
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="truncate text-muted">{product.categoryName ?? "Produto"}</span>
          <span className="shrink-0 font-medium text-green">{delivery}</span>
        </div>

        <h3 className="font-serif text-[1.15rem] leading-snug text-ink">
          <Link href={`/produto/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted">{product.shortDescription}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            {q.promoActive && (
              <p className="text-xs text-muted tabular">
                <s>{formatMoney(q.listTotalCents)}</s>
              </p>
            )}
            <p className="font-serif text-xl leading-none text-ink tabular" style={{ fontVariationSettings: '"opsz" 36' }}>
              {formatMoney(q.totalCents)}
            </p>
            {bundle && <p className="mt-1 text-[11px] text-muted">{bundle}</p>}
          </div>
          <Button
            variant={added ? "primary" : "accent"}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              quickAdd();
            }}
            aria-label={`Adicionar ${product.name} ao carrinho`}
          >
            {added ? "Adicionado ✓" : inCart ? "No carrinho" : "Adicionar"}
          </Button>
        </div>
      </div>
    </article>
  );
}