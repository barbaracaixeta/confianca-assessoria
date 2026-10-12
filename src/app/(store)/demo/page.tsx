import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { getDemoSessionUser, getStudioSnapshot } from "@/lib/demo/order-studio";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, ORDER_TIMELINE, timelineProgress } from "@/lib/orders/state-machine";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  createDemoOrderAction,
  enterDemoSessionAction,
  leaveDemoSessionAction,
  resetDemoAction,
  simulatePaymentAction,
} from "./actions";

export const dynamic = "force-dynamic";

const TRANSITIONS: { next: string; label: string; hint: string }[] = [
  { next: "confirmed", label: "Confirmar pagamento", hint: "Webhook PAYMENT_CONFIRMED" },
  { next: "received", label: "Receber pagamento", hint: "Webhook PAYMENT_RECEIVED" },
  { next: "refused", label: "Recusar", hint: "Webhook PAYMENT_REFUSED" },
  { next: "refunded", label: "Estornar", hint: "Webhook PAYMENT_REFUNDED" },
];

export default async function DemoStudioPage() {
  if (isSupabaseConfigured) notFound();
  const [snapshot, demoUser] = await Promise.all([getStudioSnapshot(), getDemoSessionUser()]);

  return (
    <div className="mx-auto max-w-[900px] px-5 pt-12 pb-24 md:px-8 md:pt-16">
      <p className="text-sm font-medium text-green">Ferramenta de desenvolvimento</p>
      <h1 className="display mt-2 text-[3rem] text-pine md:text-[3.9rem]">Order Studio</h1>
      <p className="mt-4 max-w-[62ch] leading-relaxed text-ink-2">
        Exercita em memória o fluxo de entrega de produtos digitais sem depender do Supabase ou do Asaas: cria um pedido
        com preço real (<code className="rounded bg-sheet px-1.5 py-0.5 text-xs">priceCart</code>), simula o webhook de
        pagamento e verifica a auto-liberação para <em>completed</em> e a rota de download. Estes controles não existem em
        produção.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <form action={createDemoOrderAction}>
          <button type="submit" className="rounded-[var(--radius-xs)] bg-pine px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-pine-deep">
            Criar pedido de demonstração
          </button>
        </form>
        <form action={enterDemoSessionAction}>
          <button
            type="submit"
            disabled={Boolean(demoUser)}
            className="rounded-[var(--radius-xs)] border border-line px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-pine disabled:cursor-not-allowed disabled:opacity-50"
          >
            {demoUser ? "Sessão demo ativa" : "Entrar como cliente demo"}
          </button>
        </form>
        {demoUser && (
          <form action={leaveDemoSessionAction}>
            <button type="submit" className="rounded-[var(--radius-xs)] border border-line px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-pine">
              Sair da sessão demo
            </button>
          </form>
        )}
        <form action={resetDemoAction}>
          <button type="submit" className="rounded-[var(--radius-xs)] border border-danger/40 px-5 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/5">
            Reiniciar studio
          </button>
        </form>
      </div>

      {!demoUser && (
        <p className="mt-4 rounded-[var(--radius-sm)] border border-dashed border-line bg-sheet px-4 py-3 text-sm text-muted">
          Entre como cliente demo para habilitar <Link className="link-underline text-pine" href="/minha-conta/produtos">/minha-conta/produtos</Link> e o download autorizado.
        </p>
      )}

      {snapshot.feedback && (
        <p className="mt-4 rounded-[var(--radius-sm)] border border-pine/30 bg-green-50 px-4 py-3 text-sm text-pine">
          {snapshot.feedback}
        </p>
      )}

      {snapshot.orders.length === 0 ? (
        <div className="mt-12 rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center">
          <p className="text-xl text-ink">Nenhum pedido no studio ainda.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Clique em “Criar pedido de demonstração” para começar. O pedido nasce em <em>aguardando pagamento</em> com
            um produto digital do catálogo.
          </p>
        </div>
      ) : (
        <ul className="mt-12 space-y-6">
          {snapshot.orders.map((o) => (
            <li key={o.id} className="rounded-[var(--radius-lg)] border border-line bg-sheet p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-[1.8rem] text-ink">
                    Pedido <span className="tabular">{o.number}</span>
                  </h2>
                  <p className="mt-1 text-sm text-muted">{o.productName} · {formatMoney(o.totalCents)} · criado em {formatDate(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink">{ORDER_STATUS_LABEL[o.status]}</p>
                  <p className="text-xs text-muted">{PAYMENT_STATUS_LABEL[o.paymentStatus]}</p>
                </div>
              </div>

              <ol className="mt-6 flex">
                {ORDER_TIMELINE.map((step, i) => {
                  const done = timelineProgress(o.status) >= i;
                  const current = timelineProgress(o.status) === i && o.status !== "cancelled";
                  return (
                    <li key={step.status} className={`flex-1 text-center text-xs ${i > 0 ? "relative before:absolute before:top-3 before:left-0 before:right-1/2 before:h-px before:bg-line" : ""}`}>
                      <span className={`mx-auto block size-6 rounded-full border ${done ? "border-pine bg-pine text-paper" : "border-line bg-paper text-muted"} ${current ? "ring-4 ring-pine/15" : ""}`}>
                        <svg viewBox="0 0 24 24" className="mx-auto mt-1 size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                          {done && <path d="M5 13l4 4L19 7" />}
                        </svg>
                      </span>
                      <span className={`mt-2 block ${done ? "text-pine" : "text-muted"}`}>{step.label}</span>
                    </li>
                  );
                })}
              </ol>

              {o.downloadAllowed && (
                <p className="mt-6 rounded-[var(--radius-sm)] bg-green-50 px-4 py-3 text-sm text-pine">
                  Produto liberado.{" "}
                  {o.fileId && (
                    <a href={`/api/downloads/${o.fileId}`} className="link-underline font-semibold underline underline-offset-2">
                      Baixar arquivo de demonstração
                    </a>
                  )}
                  {" · "}
                  <Link className="font-semibold underline underline-offset-2" href="/minha-conta/produtos">Abrir Meus produtos</Link>
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
                {TRANSITIONS.map((t) => (
                  <form key={t.next} action={simulatePaymentAction}>
                    <input type="hidden" name="providerPaymentId" value={o.providerPaymentId} />
                    <input type="hidden" name="next" value={t.next} />
                    <button type="submit" className="rounded-[var(--radius-xs)] border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-pine hover:text-pine">
                      {t.label}
                    </button>
                  </form>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">Pagamento <span className="tabular">{o.providerPaymentId}</span></p>
            </li>
          ))}
        </ul>
      )}

      {snapshot.downloads.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[1.5rem] text-ink">Downloads registrados (auditoria)</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {snapshot.downloads.map((d) => (
              <li key={d.id}>
                {formatDate(d.createdAt, { dateStyle: "short", timeStyle: "short" })} · arquivo <span className="tabular">{d.fileId}</span> · pedido <span className="tabular">{d.orderId ?? "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}