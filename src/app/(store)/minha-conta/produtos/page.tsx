import Link from "next/link";
import { getMyPurchasedProducts } from "@/lib/orders/customer-queries";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { cn, formatDate, formatBytes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MyProductsPage() {
  const products = await getMyPurchasedProducts();
  const totalFiles = products.reduce((n, p) => n + p.files.length, 0);

  return (
    <div>
      <h1 className="display text-[2.5rem] text-pine md:text-[3rem]">Meus produtos</h1>
      <p className="mt-3 max-w-[56ch] text-muted">
        {totalFiles > 0
          ? `${products.length} ${products.length === 1 ? "produto liberado" : "produtos liberados"} para download. Os links são temporários e podem ser usados quantas vezes você quiser.`
          : "Os materiais que você comprar aparecem aqui assim que o pagamento for confirmado."}
      </p>

      <div className="mt-10 space-y-10">
        {products.map((p) => (
          <section key={p.productId} className="border-t-2 border-pine pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <Link href={`/produto/${p.slug}`} className="font-serif text-2xl text-ink hover:text-pine">
                  {p.name}
                </Link>
                {p.categoryName && <p className="mt-1 text-xs text-muted">{p.categoryName}</p>}
              </div>
              <p className="text-xs text-muted">
                Comprado em {formatDate(p.purchasedAt)} · Pedido #<Link href="/minha-conta/pedidos" className="tabular underline underline-offset-2 hover:text-pine">{p.orderNumber}</Link>
              </p>
            </div>

            {p.files.length > 0 ? (
              <ul className="mt-5 grid gap-3 md:grid-cols-2">
                {p.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-4">
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[10px] font-bold uppercase", f.fileFormat.startsWith("application/zip") ? "bg-amber-50 text-amber-ink" : "bg-green-50 text-pine")}>
                      {f.fileFormat.split("/").pop()?.slice(0, 4)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{f.fileName}</p>
                      <p className="text-xs text-muted">{f.fileSize ? formatBytes(f.fileSize) : f.fileFormat}</p>
                    </div>
                    <a
                      href={`/api/downloads/${f.id}`}
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-xs)] bg-pine px-4 text-sm font-semibold text-paper transition-colors hover:bg-pine-deep"
                    >
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" />
                      </svg>
                      Baixar
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">Este produto ainda não tem arquivos disponíveis.</p>
            )}
          </section>
        ))}
      </div>

      {products.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="Você ainda não tem produtos liberados"
            description="Quando o pagamento for confirmado, os materiais aparecem aqui automaticamente para download."
            action={<ButtonLink href="/loja">Ver produtos</ButtonLink>}
          />
        </div>
      )}
    </div>
  );
}