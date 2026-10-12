import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderForViewer } from "@/lib/orders/queries";
import { asaas, isAsaasConfigured } from "@/lib/asaas/client";
import { isPaid, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders/state-machine";
import { OrderTimeline } from "@/components/store/order-timeline";
import { Alert, Badge } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { CopyPix, PaymentWatcher } from "./payment-status";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedido", robots: { index: false, follow: false } };

async function pixImage(paymentId: string | null): Promise<string | null> {
  if (!paymentId || !isAsaasConfigured()) return null;
  try {
    return (await asaas.getPixQrCode(paymentId)).encodedImage;
  } catch {
    return null;
  }
}

export default async function OrderPage({ params, searchParams }: PageProps<"/pedido/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t : null;
  const order = await getOrderForViewer(id, token);
  if (!order) notFound();

  const pay = order.payment;
  const pending = order.paymentStatus === "pending";
  const failed = ["refused", "overdue", "cancelled"].includes(order.paymentStatus);
  const paid = isPaid(order.paymentStatus);
  const qr = pending && pay?.method === "pix" ? await pixImage(pay.providerPaymentId) : null;

  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-12 pb-24 md:px-8">
      <PaymentWatcher orderId={order.id} token={token} initial={order.paymentStatus} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Pedido realizado em {formatDate(order.createdAt, { dateStyle: "long" })}</p>
          <h1 className="display mt-1 text-[3rem] text-pine tabular md:text-[3.9rem]">#{order.number}</h1>
        </div>
        <Badge tone={paid ? "green" : failed ? "danger" : "amber"}>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</Badge>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
        <div className="space-y-10">
          {/* Estado do pagamento */}
          {pending && pay?.method === "pix" && (
            <section aria-labelledby="pix-titulo" className="border-t-2 border-amber bg-sheet p-6 md:p-8">
              <h2 id="pix-titulo" className="text-[1.8rem] text-ink">Aguardando pagamento</h2>
              <p className="mt-2 max-w-[52ch] text-muted">
                Abra o app do seu banco, escolha Pix e escaneie o código ou cole o código copia e cola. Esta página atualiza
                sozinha quando o pagamento for confirmado.
              </p>
              <div className="mt-6 grid items-center gap-8 md:grid-cols-[200px_minmax(0,1fr)]">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`data:image/png;base64,${qr}`} alt="QR Code Pix para pagamento" width={200} height={200} className="rounded-[var(--radius-xs)] border border-line" />
                ) : (
                  <div className="flex size-[200px] items-center justify-center border border-dashed border-line-strong p-4 text-center text-xs text-muted">
                    QR Code indisponível no momento. Use o código copia e cola.
                  </div>
                )}
                <div className="space-y-4">
                  <p>
                    <span className="text-sm text-muted">Valor</span>
                    <span className="block font-display font-bold text-3xl text-ink tabular">{formatMoney(order.totalCents)}</span>
                  </p>
                  {pay.pixPayload && <CopyPix payload={pay.pixPayload} />}
                  {pay.pixExpiresAt && (
                    <p className="text-xs text-muted">Válido até {formatDate(pay.pixExpiresAt, { dateStyle: "short", timeStyle: "short" })}.</p>
                  )}
                  <p className="flex items-center gap-2 text-sm text-amber-ink" role="status">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber opacity-60 motion-reduce:hidden" />
                      <span className="relative inline-flex size-2 rounded-full bg-amber" />
                    </span>
                    Aguardando pagamento
                  </p>
                </div>
              </div>
            </section>
          )}

          {pending && pay?.method === "credit_card" && (
            <Alert tone="amber" title="Pagamento em análise" role="status">
              A operadora está processando o cartão final {pay.cardLast4}. Esta página atualiza sozinha.
            </Alert>
          )}

          {paid && (
            <section className="border-t-2 border-pine bg-green-50 p-6 md:p-8" role="status">
              <h2 className="text-[1.8rem] text-pine-900">Pagamento confirmado</h2>
              <p className="mt-2 max-w-[56ch] text-ink-2">
                Obrigado! Seus produtos já estão liberados e prontos para download.
                {order.customer.profileId
                  ? " Acesse Meus produtos pela sua conta."
                  : ` Crie sua conta com o e-mail ${order.customer.email} para acessar os produtos e acompanhar seus pedidos.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {order.customer.profileId ? (
                  <ButtonLink href="/minha-conta/produtos">Abrir Meus produtos</ButtonLink>
                ) : (
                  <ButtonLink href={`/cadastro?email=${encodeURIComponent(order.customer.email)}&next=/minha-conta/produtos`}>
                    Criar conta e acessar produtos
                  </ButtonLink>
                )}
              </div>
            </section>
          )}

          {failed && (
            <Alert tone="danger" title={`Pagamento ${PAYMENT_STATUS_LABEL[order.paymentStatus].toLowerCase()}`} role="alert">
              Não conseguimos confirmar o pagamento deste pedido. Você pode refazer a compra com Pix ou outro cartão.{" "}
              <Link href="/carrinho" className="font-medium underline underline-offset-2">Voltar ao carrinho</Link>
            </Alert>
          )}

          {/* Itens */}
          <section aria-labelledby="itens-titulo">
            <h2 id="itens-titulo" className="text-[1.5rem] text-ink">Produtos</h2>
            <ul className="mt-4 border-t border-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-4 border-b border-line py-4">
                  <div>
                    <p className="text-ink">{it.productName}</p>
                    {it.quantity > 1 && <p className="text-sm text-muted">{it.quantity} × {formatMoney(it.unitPriceCents)}</p>}
                    {it.notes && <p className="mt-1 max-w-[60ch] text-sm text-muted">{it.notes}</p>}
                  </div>
                  <p className="tabular text-ink">{formatMoney(it.totalCents)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular">{formatMoney(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && (
                <div className="flex justify-between"><dt className="text-muted">Desconto{order.couponCode && ` (${order.couponCode})`}</dt><dd className="tabular text-amber-ink">−{formatMoney(order.discountCents)}</dd></div>
              )}
              <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Total</dt><dd className="tabular">{formatMoney(order.totalCents)}</dd></div>
            </dl>
          </section>
        </div>

        <aside className="space-y-8">
          <section className="bg-sheet p-6">
            <h2 className="text-[1.5rem] text-ink">Andamento</h2>
            <p className="mt-1 text-sm text-muted">{ORDER_STATUS_LABEL[order.status]}</p>
            <div className="mt-5">
              <OrderTimeline status={order.status} history={order.history} />
            </div>
          </section>
          <dl className="space-y-3 text-sm">
            {order.dueAt && (
              <div><dt className="text-muted">Prazo previsto</dt><dd className="text-ink">{formatDate(order.dueAt)}</dd></div>
            )}
            {pay && (
              <div>
                <dt className="text-muted">Forma de pagamento</dt>
                <dd className="text-ink">
                  {pay.method === "pix" ? "Pix" : `Cartão ${pay.cardBrand ?? ""} final ${pay.cardLast4}${pay.installments > 1 ? `, ${pay.installments}x` : ""}`}
                </dd>
              </div>
            )}
          </dl>
          <p className="text-xs leading-relaxed text-muted">
            Guarde o link deste pedido: ele foi enviado para {order.customer.email}.
          </p>
        </aside>
      </div>
    </div>
  );
}
