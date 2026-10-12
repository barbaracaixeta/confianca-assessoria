"use client";

import Link from "next/link";
import { useState } from "react";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { PurchasedProduct } from "@/lib/orders/customer-queries";

export function PurchasedProductCard({ product }: { product: PurchasedProduct }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-sheet">
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:p-5">
        <Link href={`/produto/${product.slug}`} className="group relative block overflow-hidden rounded-[var(--radius-sm)] border border-line bg-paper" tabIndex={-1} aria-hidden="true">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-paper">
              <svg viewBox="0 0 24 24" className="size-7 text-muted" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <path d="M6 3h8l4 4v14H6V3Z" />
                <path d="M14 3v4h4M9 12h6M9 15h6" />
              </svg>
            </div>
          )}
        </Link>

        <div className="flex min-w-0 flex-col">
          <Link href={`/produto/${product.slug}`} className="font-serif text-lg leading-snug text-ink hover:text-pine sm:text-xl">
            {product.name}
          </Link>
          <p className="mt-1 text-xs text-muted">
            {product.categoryName ? `${product.categoryName} · ` : ""}
            {product.files.length} {product.files.length === 1 ? "arquivo" : "arquivos"}
          </p>
          <p className="mt-1 text-xs text-muted">
            Comprado em {formatDate(product.purchasedAt)} · Pedido{" "}
            <Link href="/minha-conta/pedidos" className="tabular text-pine underline underline-offset-2 hover:opacity-80">#{product.orderNumber}</Link>
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            {product.files.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={`arquivos-${product.productId}`}
                className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-xs)] border border-line-strong bg-paper px-3.5 text-sm font-medium text-ink transition-colors hover:border-pine hover:text-pine"
              >
                <svg viewBox="0 0 24 24" className={cn("size-4 transition-transform", open && "rotate-90")} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
                {open ? "Ocultar arquivos" : "Ver arquivos"}
              </button>
            )}
            <Link
              href={`/produto/${product.slug}`}
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-xs)] px-3.5 text-sm font-medium text-pine hover:bg-green-50"
            >
              Abrir produto
            </Link>
          </div>
        </div>
      </div>

      {open && product.files.length > 0 && (
        <div id={`arquivos-${product.productId}`} className="border-t border-line bg-paper animate-[rise-in_280ms_var(--ease-out-expo)]">
          <ul className="divide-y divide-line">
            {product.files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[9px] font-bold uppercase", f.fileFormat.startsWith("application/zip") ? "bg-amber-50 text-amber-ink" : "bg-green-50 text-pine")}>
                  {f.fileFormat.split("/").pop()?.slice(0, 4)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{f.fileName}</p>
                  <p className="text-xs text-muted">{f.fileSize ? formatBytes(f.fileSize) : f.fileFormat}</p>
                </div>
                <a
                  href={`/api/downloads/${f.id}`}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-xs)] bg-pine px-3.5 text-sm font-semibold text-paper transition-colors hover:bg-pine-deep"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" />
                  </svg>
                  Baixar
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}