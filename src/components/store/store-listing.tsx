"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { ProductCard } from "./product-card";
import { quoteProduct } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { Category, Product } from "@/types/domain";

const SORTS = [
  { value: "relevance", label: "Relevância" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
  { value: "best-sellers", label: "Mais vendidos" },
  { value: "newest", label: "Mais recentes" },
] as const;

const PRICE_MAX = [
  { value: "", label: "Qualquer preço" },
  { value: "3000", label: "Até R$ 30" },
  { value: "6000", label: "Até R$ 60" },
  { value: "10000", label: "Até R$ 100" },
  { value: "15000", label: "Até R$ 150" },
  { value: "20000", label: "Até R$ 200" },
] as const;

const SELECT_CLASS =
  "h-10 appearance-none rounded-[var(--radius-sm)] border border-line-strong bg-sheet bg-[length:12px] bg-[right_12px_center] bg-no-repeat pl-3 pr-9 text-sm text-ink outline-none focus:border-pine";
const SELECT_ARROW = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' stroke='%231f2933' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
} as const;

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm transition-colors",
        active ? "border-pine bg-pine text-paper" : "border-line-strong text-ink-2 hover:border-pine hover:text-pine",
      )}
    >
      {children}
    </button>
  );
}

export function StoreListing({ products, categories }: { products: Product[]; categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const category = searchParams.get("categoria") ?? "";
  const sort = searchParams.get("sort") ?? "relevance";
  const priceMax = searchParams.get("max") ?? "";
  const offer = searchParams.get("ofertas") === "1";
  const isNew = searchParams.get("novos") === "1";
  const best = searchParams.get("mais-vendidos") === "1";

  function patch(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/loja?${qs}` : "/loja", { scroll: false }));
  }

  const visible = useMemo(() => {
    let list = [...products];
    if (q) {
      list = list.filter((p) =>
        [p.name, p.shortDescription, p.categoryName ?? ""].some((f) => f.toLowerCase().includes(q)),
      );
    }
    if (category) list = list.filter((p) => p.categoryId === category);
    const priced = list.map((p) => ({ p, q: quoteProduct(p) }));
    let filtered = priced;
    if (offer) filtered = filtered.filter((x) => x.q.promoActive);
    if (isNew) filtered = filtered.filter((x) => x.p.isNew);
    if (best) filtered = filtered.filter((x) => x.p.isBestSeller);
    const maxCents = priceMax ? Number(priceMax) : null;
    if (maxCents) filtered = filtered.filter((x) => x.q.totalCents <= maxCents);

    switch (sort) {
      case "price-asc":
        filtered.sort((a, b) => a.q.totalCents - b.q.totalCents);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.q.totalCents - a.q.totalCents);
        break;
      case "best-sellers":
        filtered.sort((a, b) => Number(b.p.isBestSeller) - Number(a.p.isBestSeller) || a.p.sortOrder - b.p.sortOrder);
        break;
      case "newest":
        filtered.sort((a, b) => Number(b.p.isNew) - Number(a.p.isNew) || a.p.sortOrder - b.p.sortOrder);
        break;
      default:
        filtered.sort((a, b) => a.p.sortOrder - b.p.sortOrder);
    }
    return filtered.map((x) => x.p);
  }, [products, q, category, sort, priceMax, offer, isNew, best]);

  const activeCount = [offer, isNew, best, category, priceMax].filter(Boolean).length;

  return (
    <div>
      <div className="mt-8 grid gap-6 border-y border-line py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)] md:items-center">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => patch({ q: e.target.value || null })}
              placeholder="Buscar por TCC, ABNT, artigo, template…"
              aria-label="Buscar produtos"
              className="h-11 w-full rounded-[var(--radius-sm)] border border-line-strong bg-sheet pl-10 pr-4 text-[0.9375rem] outline-none transition-colors placeholder:text-muted focus:border-pine"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Toggle active={category === ""} onClick={() => patch({ categoria: null })}>
              Todos
            </Toggle>
            {categories.map((c) => (
              <Toggle key={c.id} active={category === c.id} onClick={() => patch({ categoria: c.id === category ? null : c.id })}>
                {c.name}
              </Toggle>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Toggle active={offer} onClick={() => patch({ ofertas: offer ? null : "1" })}>
              Em oferta
            </Toggle>
            <Toggle active={isNew} onClick={() => patch({ novos: isNew ? null : "1" })}>
              Novidades
            </Toggle>
            <Toggle active={best} onClick={() => patch({ "mais-vendidos": best ? null : "1" })}>
              Mais vendidos
            </Toggle>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 md:justify-end">
          <label className="flex items-center gap-2 text-sm text-muted">
            Preço
            <select
              value={priceMax}
              onChange={(e) => patch({ max: e.target.value || null })}
              className={SELECT_CLASS}
              style={SELECT_ARROW}
            >
              {PRICE_MAX.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            Ordenar
            <select
              value={sort}
              onChange={(e) => patch({ sort: e.target.value })}
              className={SELECT_CLASS}
              style={SELECT_ARROW}
            >
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between text-sm text-muted" aria-live="polite">
        <p>
          <span className="font-medium text-ink">{visible.length}</span> {visible.length === 1 ? "produto" : "produtos"}
          {activeCount > 0 && " com filtros ativos"}
        </p>
        {isPending && <p className="text-xs text-green">Atualizando…</p>}
      </div>

      {visible.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="mt-6 border-y border-line py-16 text-center">
          <p className="text-2xl text-ink">Nenhum produto encontrado</p>
          <p className="mx-auto mt-2 max-w-sm text-muted">
            Tente ajustar a busca ou limpar os filtros para ver mais resultados.
          </p>
          <button
            type="button"
            onClick={() => router.push("/loja")}
            className="link-underline mt-5 text-sm font-medium text-pine"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}