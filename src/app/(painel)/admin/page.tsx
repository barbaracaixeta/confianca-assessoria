import type { Metadata } from "next";
import { DailyChart } from "@/components/admin/daily-chart";
import { Badge } from "@/components/ui/feedback";
import { requireAdminPermission } from "@/lib/admin/access";
import { getDashboardMetrics, getRecentOrders } from "@/lib/admin/metrics";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders/state-machine";
import { formatDate, formatMoney } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function Stat({ label, value, note, accent }: { label: string; value: string; note?: string; accent?: boolean }) {
  return (
    <div className="py-5 pr-4">
      <dt className="text-lg text-muted">{label}</dt>
      <dd className={`mt-1.5 font-sans text-[2.25rem] font-semibold leading-none tabular ${accent ? "text-amber-ink" : "text-ink"}`}>
        {value}
      </dd>
      {note && <p className="mt-1.5 text-base text-muted">{note}</p>}
    </div>
  );
}

export default async function AdminDashboard() {
  await requireAdminPermission("dashboard.view");
  const [m, recent] = await Promise.all([getDashboardMetrics(), getRecentOrders()]);
  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", timeZone: "America/Sao_Paulo" });
  m.topProducts.sort((a, b) => b.revenueCents - a.revenueCents);
  const topMax = Math.max(1, ...m.topProducts.map((p) => p.revenueCents));

  return (
    <div className="max-w-[1180px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-[2.75rem] text-pine md:text-[3.25rem]">Dashboard</h1>
        <p className="text-lg text-muted">{formatDate(new Date(), { dateStyle: "full" })}</p>
      </div>

      {/* Faturamento é a manchete; contagens operacionais logo abaixo */}
      <dl className="mt-8 grid grid-cols-2 gap-x-6 border-y border-ink/80 md:grid-cols-5">
        <Stat label="Faturamento hoje" value={formatMoney(m.revenueTodayCents)} />
        <Stat label={`Faturamento em ${monthName}`} value={formatMoney(m.revenueMonthCents)} />
        <Stat label="Ticket médio" value={formatMoney(m.avgTicketCents)} note="pedidos pagos no mês" />
        <Stat label="Pedidos hoje" value={String(m.ordersToday)} />
        <Stat label="Pedidos no mês" value={String(m.ordersMonth)} />
      </dl>
      <dl className="grid grid-cols-2 gap-x-6 border-b border-line md:grid-cols-5">
        <Stat label="Aguardando pagamento" value={String(m.awaitingPayment)} accent={m.awaitingPayment > 0} />
        <Stat label="Em produção" value={String(m.inProduction)} note="análise, produção e revisão" />
        <Stat label="Concluídos" value={String(m.completed)} note="entregues e finalizados" />
        <Stat label="Clientes novos" value={String(m.newCustomersMonth)} note="no mês" />
        <Stat label="Taxa de conversão" value={`${m.conversionRate.toLocaleString("pt-BR")}%`} note="pedidos pagos / criados" />
      </dl>

      <div className="mt-10 grid gap-8 xl:grid-cols-2">
        <section className="bg-sheet p-5 md:p-6">
          <h2 className="text-[2rem] text-ink">Faturamento diário</h2>
          <p className="text-base text-muted">Pedidos pagos, últimos 30 dias</p>
          <div className="mt-5"><DailyChart data={m.daily.map((d) => ({ day: d.day, value: d.revenueCents }))} kind="bar" format="money" /></div>
        </section>
        <section className="bg-sheet p-5 md:p-6">
          <h2 className="text-[2rem] text-ink">Pedidos por dia</h2>
          <p className="text-base text-muted">Todos os pedidos criados, últimos 30 dias</p>
          <div className="mt-5"><DailyChart data={m.daily.map((d) => ({ day: d.day, value: d.orders }))} kind="line" format="count" /></div>
        </section>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="bg-sheet p-5 md:p-6">
          <h2 className="text-[2rem] text-ink">Produtos mais vendidos</h2>
          {m.topProducts.length === 0 ? (
            <p className="mt-4 text-lg text-muted">Sem vendas pagas no período.</p>
          ) : (
            <ol className="mt-4 space-y-3.5">
              {m.topProducts.map((p) => (
                <li key={p.name}>
                  <div className="flex items-baseline justify-between gap-4 text-lg">
                    <span className="text-ink">{p.name}</span>
                    <span className="tabular text-ink-2">{formatMoney(p.revenueCents)} <span className="text-muted">({p.quantity})</span></span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-green-50">
                    <div className="h-full rounded-full bg-green" style={{ width: `${(p.revenueCents / topMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="bg-sheet p-5 md:p-6">
          <h2 className="text-[2rem] text-ink">Cupons mais usados</h2>
          {m.topCoupons.length === 0 ? (
            <p className="mt-4 text-lg text-muted">Nenhum cupom utilizado ainda.</p>
          ) : (
            <table className="mt-4 w-full text-lg">
              <thead><tr className="border-b border-line text-left text-base text-muted"><th className="pb-2 font-normal">Código</th><th className="pb-2 text-right font-normal">Usos</th><th className="pb-2 text-right font-normal">Desconto</th></tr></thead>
              <tbody>
                {m.topCoupons.map((c) => (
                  <tr key={c.code} className="border-b border-line last:border-0">
                    <td className="py-2.5 font-medium text-ink">{c.code}</td>
                    <td className="py-2.5 text-right tabular">{c.uses}</td>
                    <td className="py-2.5 text-right tabular text-ink-2">{formatMoney(c.discountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="mt-8 bg-sheet p-5 md:p-6">
        <h2 className="text-[2rem] text-ink">Pedidos recentes</h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-lg text-muted">{m.isDemo ? "Os pedidos reais aparecem aqui quando o Supabase estiver configurado." : "Nenhum pedido ainda."}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-lg">
              <thead>
                <tr className="border-b border-line text-left text-base text-muted">
                  <th className="pb-2 font-normal">Pedido</th><th className="pb-2 font-normal">Cliente</th><th className="pb-2 font-normal">Status</th><th className="pb-2 font-normal">Pagamento</th><th className="pb-2 text-right font-normal">Valor</th><th className="pb-2 text-right font-normal">Data</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <td className="py-3 font-medium tabular text-ink">#{o.number}</td>
                    <td className="py-3 text-ink-2">{o.customerName}</td>
                    <td className="py-3">{ORDER_STATUS_LABEL[o.status as OrderStatus]}</td>
                    <td className="py-3"><Badge tone={o.paymentStatus === "confirmed" || o.paymentStatus === "received" ? "green" : o.paymentStatus === "pending" ? "amber" : "danger"}>{PAYMENT_STATUS_LABEL[o.paymentStatus as PaymentStatus]}</Badge></td>
                    <td className="py-3 text-right tabular">{formatMoney(o.totalCents)}</td>
                    <td className="py-3 text-right text-muted">{formatDate(o.createdAt, { dateStyle: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
