"use client";

import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { CouponForm, Totals, TrustList } from "@/components/store/order-summary";
import { usePricedCart } from "@/components/store/use-priced-cart";
import { formatDeliveryDays, formatMoney } from "@/lib/utils";
import type { ProductFile } from "@/types/domain";

function CartThumb({ product }: { product: { imageUrl: string | null; files: ProductFile[] } }) {
  const format = product.files?.[0]?.originalName.split(".").pop()?.toUpperCase() ?? "PDF";
  return (
    <span className="relative hidden aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-line bg-green-50 sm:block">
      {product.imageUrl ? (
        <Image src={product.imageUrl} alt="" fill sizes="80px" className="object-contain" />
      ) : (
        <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-[11px] font-bold tracking-wide text-green">
          {format}
        </span>
      )}
    </span>
  );
}

export function CartView() {
  const { cart, priced, error, loading } = usePricedCart();

  if (!cart.ready) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        title="Seu carrinho está vazio"
        description="Escolha um produto para ver preço, formato e seguir para o pagamento."
        action={<ButtonLink href="/loja">Ver produtos</ButtonLink>}
      />
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
      <section aria-labelledby="itens-titulo">
        <h2 id="itens-titulo" className="sr-only">Itens</h2>
        {error && <Alert tone="danger" className="mb-6" role="alert">{error}</Alert>}
        <ul className="border-t border-ink/80">
          {cart.lines.map((line) => {
            const p = priced?.lines.find((l) => l.product.id === line.productId);
            const variable = p && (p.product.pricingUnit === "per_page" || (p.product.maxQuantity ?? 1) > 1);
            return (
              <li key={line.productId} className="grid gap-4 border-b border-line py-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-5">
                {p ? <CartThumb product={p.product} /> : <Skeleton className="hidden aspect-[4/3] w-20 sm:block" />}
                <div>
                  {p ? (
                    <>
                      <p className="text-xs text-muted">{p.product.categoryName}</p>
                      <Link href={`/produto/${p.product.slug}`} className="font-display font-bold text-xl text-ink hover:text-pine">
                        {p.product.name}
                      </Link>
                      {p.product.shortDescription && (
                        <p className="mt-1.5 max-w-[44ch] text-sm leading-relaxed text-ink-2">{p.product.shortDescription}</p>
                      )}
                      <p className="mt-1 text-sm text-muted">
                        {p.product.deliveryDays === 0 ? "Entrega imediata após o pagamento" : `Prazo: ${p.product.deliveryLabel ?? formatDeliveryDays(p.product.deliveryDays)}`}
                      </p>
                    </>
                  ) : (
                    <Skeleton className="h-12 w-60" />
                  )}

                  <div className="mt-4 flex flex-wrap items-end gap-4">
                    {variable && p && (
                      <label className="flex flex-col gap-1 text-xs text-muted">
                        {p.product.pricingUnit === "per_page" ? "Páginas" : "Quantidade"}
                        <input
                          key={line.quantity}
                          type="number"
                          inputMode="numeric"
                          min={p.product.minQuantity}
                          max={p.product.maxQuantity ?? undefined}
                          defaultValue={line.quantity}
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (Number.isFinite(n) && n !== line.quantity) cart.setQuantity(line.productId, Math.max(1, Math.floor(n)));
                          }}
                          className="h-10 w-24 rounded-[var(--radius-sm)] border border-line-strong bg-sheet px-3 text-sm text-ink tabular"
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => cart.remove(line.productId)}
                      className="h-10 text-sm text-muted underline-offset-2 hover:text-danger hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  {p ? (
                    <>
                      <p className="font-display font-bold text-xl text-ink tabular">{formatMoney(p.quote.totalCents)}</p>
                      {p.quote.promoActive && <s className="text-sm text-muted tabular">{formatMoney(p.quote.listTotalCents)}</s>}
                      {p.product.pricingUnit === "per_page" && (
                        <p className="text-xs text-muted">
                          {p.quote.minApplied ? "Valor mínimo do produto" : `${p.quote.quantity} × ${formatMoney(p.quote.unitCents)}`}
                        </p>
                      )}
                    </>
                  ) : (
                    <Skeleton className="ml-auto h-6 w-24" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Link href="/loja" className="link-underline text-sm font-medium text-pine">
            Adicionar outro produto
          </Link>
          <button
            type="button"
            onClick={() => {
              if (confirm("Esvaziar o carrinho? Todos os itens serão removidos.")) cart.clear();
            }}
            className="h-10 text-sm text-muted underline-offset-2 hover:text-danger hover:underline"
          >
            Esvaziar carrinho
          </button>
        </div>
      </section>

      <aside aria-label="Resumo do pedido" className="lg:sticky lg:top-28 lg:self-start">
        <div className="border-t-2 border-pine bg-sheet p-6">
          <h2 className="text-[1.5rem] text-ink">Resumo</h2>
          <div className="mt-5">
            <CouponForm
              couponCode={cart.couponCode}
              coupon={priced?.coupon ?? null}
              onApply={(code) => cart.setCouponCode(code)}
              onRemove={() => cart.setCouponCode(null)}
            />
          </div>
          <div className="mt-6">
            <Totals priced={priced} loading={loading} />
          </div>
          <TrustList className="mt-6 border-t border-line pt-5" />
          <ButtonLink
            href="/checkout"
            variant="accent"
            size="lg"
            className="mt-6 w-full"
            aria-disabled={!priced || loading || undefined}
            onClick={(e) => (!priced || loading) && e.preventDefault()}
          >
            Ir para o pagamento
          </ButtonLink>
          <p className="mt-3 text-center text-xs text-muted">Pix com confirmação automática ou cartão de crédito.</p>
        </div>
      </aside>
    </div>
  );
}
