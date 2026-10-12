import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderForViewer } from "@/lib/orders/queries";
import { getMyFiles } from "@/lib/orders/customer-queries";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, isPaid } from "@/lib/orders/state-machine";
import { OrderTimeline } from "@/components/store/order-timeline";
import { FileList } from "@/components/store/file-list";
import { Alert, Badge } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function MyOrderPage({ params }: PageProps<"/minha-conta/pedidos/[id]">) {
  const { id } = await params;
  const order = await getOrderForViewer(id);
  if (!order) notFound();

  const files = await getMyFiles(order.id);
  const deliveries = files.filter((f) => f.kind === "delivery");
  const released = isPaid(order.paymentStatus) && order.status !== "cancelled";

  return (
    <div>
      <Link href="/minha-conta/pedidos" className="text-sm text-muted hover:text-pine">Pedidos</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[2.25rem] text-pine tabular md:text-[2.75rem]">#{order.number}</h1>
        <Badge tone={order.status === "cancelled" ? "danger" : "green"}>{ORDER_STATUS_LABEL[order.status]}</Badge>
      </div>

      {order.paymentStatus === "pending" && (
        <Alert tone="amber" title="Aguardando pagamento" className="mt-6">
          Os produtos serão liberados assim que o pagamento for confirmado.{" "}
          <Link href={`/pedido/${order.id}`} className="font-medium underline underline-offset-2">Ver dados de pagamento</Link>
        </Alert>
      )}

      <div className="mt-10 grid gap-12 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-12">
          <section>
            <h2 className="font-serif text-2xl text-ink">Produtos</h2>
            <ul className="mt-4 border-t border-ink/80">
              {order.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-5">
                  <div>
                    <Link href={`/produto/${item.productSlug}`} className="font-serif text-lg text-ink hover:text-pine">
                      {item.productName}
                    </Link>
                    {item.quantity > 1 && <p className="text-sm text-muted">Quantidade: {item.quantity}</p>}
                  </div>
                  <p className="text-sm text-muted tabular">{formatMoney(item.totalCents)}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">
              Precisa baixar novamente? Os materiais comprados ficam em{" "}
              <Link href="/minha-conta/produtos" className="font-medium text-pine underline underline-offset-2">Meus produtos</Link>.
            </p>
          </section>

          {released && deliveries.length > 0 && (
            <section>
              <h2 className="font-serif text-2xl text-ink">Entrega</h2>
              <div className="mt-4"><FileList files={deliveries} /></div>
            </section>
          )}

          {released && deliveries.length === 0 && (
            <Alert tone="green" title="Produtos liberados" className="mt--2">
              O pagamento foi confirmado e os produtos já estão disponíveis.{" "}
              <ButtonLink href="/minha-conta/produtos" variant="outline" size="sm">Abrir Meus produtos</ButtonLink>
            </Alert>
          )}
        </div>

        <aside className="space-y-8">
          <section className="bg-sheet p-6">
            <h2 className="font-serif text-xl text-ink">Andamento</h2>
            <div className="mt-5"><OrderTimeline status={order.status} history={order.history} /></div>
          </section>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-muted">Valor</dt><dd className="tabular text-ink">{formatMoney(order.totalCents)}{order.discountCents > 0 && <span className="text-muted"> (desconto de {formatMoney(order.discountCents)})</span>}</dd></div>
            <div><dt className="text-muted">Pagamento</dt><dd className="text-ink">{PAYMENT_STATUS_LABEL[order.paymentStatus]}</dd></div>
            <div><dt className="text-muted">Data</dt><dd className="text-ink">{formatDate(order.createdAt)}</dd></div>
          </dl>
          {order.status === "cancelled" && <ButtonLink href="/loja" variant="outline">Comprar novamente</ButtonLink>}
        </aside>
      </div>
    </div>
  );
}