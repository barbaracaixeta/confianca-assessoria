"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/feedback";
import { getPaymentEventsAction } from "./actions";
import { PAYMENT_STATUS_LABEL } from "@/lib/orders/state-machine";
import { formatDate, formatMoney } from "@/lib/utils";
import type { AdminPaymentEvent, AdminPaymentRow } from "@/lib/admin/payments";
import type { PaymentMethod, PaymentStatus } from "@/types/domain";

const METHOD_LABEL: Record<PaymentMethod, string> = { pix: "Pix", credit_card: "Cartão" };

function statusTone(status: PaymentStatus): "neutral" | "green" | "amber" | "danger" {
  if (status === "confirmed" || status === "received") return "green";
  if (status === "pending" || status === "overdue") return "amber";
  if (status === "refused" || status === "cancelled" || status === "refunded") return "danger";
  return "neutral";
}

function shortDay(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function PaymentManager({ initial }: { initial: AdminPaymentRow[] }) {
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, AdminPaymentEvent[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Erro ao carregar.");
    return res;
  }

  function toggle(row: AdminPaymentRow) {
    if (!row.providerPaymentId) return;
    if (expanded === row.id) {
      setExpanded(null);
      return;
    }
    setExpanded(row.id);
    if (events[row.providerPaymentId]) return;
    void run(async () => {
      const res = await getPaymentEventsAction({ providerPaymentId: row.providerPaymentId! });
      if (res.ok) setEvents((e) => ({ ...e, [row.providerPaymentId!]: res.data }));
      return res;
    });
  }

  const rows = initial.filter(
    (r) => (status === "all" || r.status === status) && (method === "all" || r.method === method),
  );

  return (
    <div className="mt-8 space-y-6">
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}

      <div className="flex flex-wrap items-end gap-4">
        <Field label="Status" className="w-56">
          {(props) => (
            <Select {...props} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Todos</option>
              {Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Método" className="w-44">
          {(props) => (
            <Select {...props} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="all">Todos</option>
              <option value="pix">Pix</option>
              <option value="credit_card">Cartão</option>
            </Select>
          )}
        </Field>
        <p className="pb-2 text-sm text-muted tabular">
          {rows.length} de {initial.length}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="pb-2 font-normal">Pedido</th>
              <th className="pb-2 font-normal">Método</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 text-right font-normal">Valor</th>
              <th className="pb-2 text-right font-normal">Parcelas</th>
              <th className="pb-2 font-normal">Provedor</th>
              <th className="pb-2 font-normal">Datas</th>
              <th className="pb-2 text-right font-normal">Eventos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isOpen = expanded === r.id;
              const list = r.providerPaymentId ? events[r.providerPaymentId] : undefined;
              return (
                <Fragment key={r.id}>
                  <tr className="border-b border-line last:border-0">
                    <td className="py-3 font-medium text-ink tabular">{r.orderNumber}</td>
                    <td className="py-3 text-ink-2">
                      {METHOD_LABEL[r.method]}
                      {r.method === "credit_card" && (r.cardBrand || r.cardLast4) && (
                        <span className="block text-xs text-muted">
                          {r.cardBrand ?? "cartão"}
                          {r.cardLast4 ? ` ••${r.cardLast4}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge tone={statusTone(r.status)}>{PAYMENT_STATUS_LABEL[r.status]}</Badge>
                      {r.failureReason && <span className="mt-1 block text-xs text-danger">{r.failureReason}</span>}
                    </td>
                    <td className="py-3 text-right tabular">{formatMoney(r.amountCents)}</td>
                    <td className="py-3 text-right tabular">{r.installments > 1 ? `${r.installments}x` : "à vista"}</td>
                    <td className="py-3">
                      <span className="block text-xs uppercase text-muted">{r.provider}</span>
                      {r.providerPaymentId && <span className="block tabular text-xs text-ink-2">{r.providerPaymentId}</span>}
                    </td>
                    <td className="py-3 text-xs text-muted">
                      <span className="block tabular text-ink-2">{formatDate(r.createdAt, { dateStyle: "short" })}</span>
                      {r.paidAt && <span className="block tabular">pago {formatDate(r.paidAt, { dateStyle: "short" })}</span>}
                      {r.dueDate && <span className="block tabular">vence {shortDay(r.dueDate)}</span>}
                    </td>
                    <td className="py-3 text-right">
                      {r.providerPaymentId ? (
                        <Button variant="ghost" size="sm" aria-expanded={isOpen} onClick={() => toggle(r)}>
                          {isOpen ? "Fechar" : "Ver"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-line bg-paper/60">
                      <td colSpan={8} className="px-3 py-4">
                        {!list ? (
                          <p className="text-sm text-muted">{busy ? "Carregando eventos…" : "Sem eventos registrados."}</p>
                        ) : list.length === 0 ? (
                          <p className="text-sm text-muted">Nenhum evento de webhook registrado para este pagamento.</p>
                        ) : (
                          <ul className="space-y-2">
                            {list.map((e) => (
                              <li key={e.id} className="rounded-[var(--radius-sm)] border border-line bg-sheet px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-ink">{e.event}</span>
                                  <span className="tabular text-xs text-muted">
                                    {formatDate(e.receivedAt, { dateStyle: "short", timeStyle: "short" })}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs text-muted">
                                  {e.providerEventId}
                                  {e.processedAt
                                    ? ` · processado ${formatDate(e.processedAt, { dateStyle: "short", timeStyle: "short" })}`
                                    : " · não processado"}
                                </p>
                                {e.error && <p className="mt-1 text-xs font-medium text-danger">{e.error}</p>}
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-xs text-muted hover:text-pine">Ver payload</summary>
                                  <pre className="mt-1 overflow-x-auto rounded-[var(--radius-xs)] bg-paper p-2 text-[11px] leading-relaxed text-ink-2">
                                    {JSON.stringify(e.payload, null, 2)}
                                  </pre>
                                </details>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-sm text-muted">
                  {initial.length === 0 ? "Nenhum pagamento registrado ainda." : "Nenhum pagamento corresponde aos filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
