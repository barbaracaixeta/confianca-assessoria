"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, Alert } from "@/components/ui/feedback";
import { allowedStaffTransitions, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders/state-machine";
import { formatDate, formatMoney } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/types/domain";
import {
  setOrderAssigneeAction,
  setOrderDueDateAction,
  setOrderNotesAction,
  updateOrderStatusAction,
} from "../actions";
import type { AdminOrderDetail, StaffOption } from "@/lib/admin/orders";

export function OrderDetail({ order, staff }: { order: AdminOrderDetail; staff: StaffOption[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [assigneeId, setAssigneeId] = useState(order.assigneeId ?? "");
  const [dueAt, setDueAt] = useState(order.dueAt ? new Date(order.dueAt).toISOString().slice(0, 16) : "");
  const [notes, setNotes] = useState(order.customerNotes ?? "");

  const transitions = useMemo(() => allowedStaffTransitions(order.status as OrderStatus), [order.status]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Erro ao salvar.");
  }

  function changeStatus() {
    if (!status) return;
    void run(async () => {
      const res = await updateOrderStatusAction({ id: order.id, status: status as OrderStatus, note: note || undefined });
      if (res.ok) {
        setStatus("");
        setNote("");
      }
      return res;
    });
  }

  return (
    <div className="mt-8 max-w-[1080px] space-y-8">
      {error && <Alert tone="danger" role="alert">{error}</Alert>}

      <section className="rounded-[var(--radius-sm)] border border-line bg-sheet p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-serif text-2xl text-ink">Pedido #{order.number}</p>
            <p className="mt-1 text-sm text-muted">
              {formatDate(order.createdAt, { dateStyle: "full", timeStyle: "short" })} · {order.items.length} itens
            </p>
          </div>
          <div className="flex gap-2">
            <Badge tone={order.paymentStatus === "confirmed" || order.paymentStatus === "received" ? "green" : order.paymentStatus === "pending" ? "amber" : "danger"}>
              {PAYMENT_STATUS_LABEL[order.paymentStatus as PaymentStatus]}
            </Badge>
            <Badge>{ORDER_STATUS_LABEL[order.status as OrderStatus]}</Badge>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-sm md:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Subtotal</dt>
            <dd className="mt-0.5 tabular text-ink">{formatMoney(order.subtotalCents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Desconto</dt>
            <dd className="mt-0.5 tabular text-ink">{order.discountCents > 0 ? `− ${formatMoney(order.discountCents)}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Total</dt>
            <dd className="mt-0.5 font-semibold tabular text-pine">{formatMoney(order.totalCents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Cupom</dt>
            <dd className="mt-0.5 tabular text-ink">{order.couponCode ?? "—"}</dd>
          </div>
          {order.paidAt && (
            <div>
              <dt className="text-xs text-muted">Pago em</dt>
              <dd className="mt-0.5 tabular text-ink">{formatDate(order.paidAt, { dateStyle: "short", timeStyle: "short" })}</dd>
            </div>
          )}
          {order.dueAt && (
            <div>
              <dt className="text-xs text-muted">Prazo</dt>
              <dd className="mt-0.5 tabular text-ink">{formatDate(order.dueAt, { dateStyle: "short" })}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
          <h2 className="font-serif text-lg text-ink">Mover status</h2>
          <p className="mt-0.5 text-xs text-muted">
            De <span className="font-medium text-ink">{ORDER_STATUS_LABEL[order.status as OrderStatus]}</span>
          </p>
          {transitions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhuma transição disponível a partir deste status.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <Field label="Para">
                {(props) => (
                  <Select {...props} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Selecione…</option>
                    {transitions.map((t) => (
                      <option key={t} value={t}>{ORDER_STATUS_LABEL[t]}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Justificativa" optional>
                {(props) => (
                  <Textarea {...props} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opção lançada no histórico" className="min-h-16" />
                )}
              </Field>
              <div className="flex justify-end">
                <Button onClick={changeStatus} loading={busy} disabled={!status}>Aplicar transição</Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
            <h2 className="font-serif text-lg text-ink">Responsável</h2>
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Equipe">
                {(props) => (
                  <Select {...props} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={staff.length === 0}>
                    <option value="">Sem responsável</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(async () => setOrderAssigneeAction({ id: order.id, assigneeId: assigneeId || null }))}
              >
                Salvar
              </Button>
            </div>
          </section>

          <section className="rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
            <h2 className="font-serif text-lg text-ink">Prazo</h2>
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Entrega prevista" optional>
                {(props) => (
                  <Input {...props} type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                )}
              </Field>
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(async () => setOrderDueDateAction({ id: order.id, dueAt: dueAt || null }))}
              >
                Salvar
              </Button>
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-[var(--radius-sm)] border border-line bg-sheet p-5 md:p-6">
        <h2 className="font-serif text-lg text-ink">Itens</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="pb-2 font-normal">Produto</th>
                <th className="pb-2 text-right font-normal">Preço unit.</th>
                <th className="pb-2 text-right font-normal">Qtd</th>
                <th className="pb-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className="py-3">
                    <span className="font-medium text-ink">{i.productName}</span>
                    <span className="block text-xs text-muted">/{i.productSlug}</span>
                  </td>
                  <td className="py-3 text-right tabular">{formatMoney(i.unitPriceCents)}</td>
                  <td className="py-3 text-right tabular">{i.quantity}</td>
                  <td className="py-3 text-right tabular text-ink">{formatMoney(i.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-sm)] border border-line bg-sheet p-5 md:p-6">
          <h2 className="font-serif text-lg text-ink">Cliente</h2>
          {order.customer ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="inline-block w-24 text-muted">Nome</dt><dd className="inline text-ink">{order.customer.fullName}</dd></div>
              <div><dt className="inline-block w-24 text-muted">E-mail</dt><dd className="inline text-ink">{order.customer.email}</dd></div>
              <div><dt className="inline-block w-24 text-muted">Telefone</dt><dd className="inline tabular text-ink">{order.customer.phone ?? "—"}</dd></div>
              <div><dt className="inline-block w-24 text-muted">CPF/CNPJ</dt><dd className="inline tabular text-ink">{order.customer.cpfCnpj ?? "—"}</dd></div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">Cliente não encontrado.</p>
          )}
          <h3 className="mt-6 font-serif text-lg text-ink">Observações do cliente</h3>
          <div className="mt-3 flex flex-col gap-3">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações internas do pedido" />
            <div className="flex justify-end">
              <Button
                variant="outline"
                loading={busy}
                onClick={() => void run(async () => setOrderNotesAction({ id: order.id, customerNotes: notes }))}
              >
                Salvar observações
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius-sm)] border border-line bg-sheet p-5 md:p-6">
          <h2 className="font-serif text-lg text-ink">Pagamento</h2>
          {order.payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhuma cobrança registrada.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {order.payments.map((p) => (
                <div key={p.id} className="rounded-[var(--radius-sm)] border border-line p-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="tabular font-medium text-ink">{formatMoney(p.amountCents)}</span>
                    <Badge tone={p.status === "confirmed" || p.status === "received" ? "green" : p.status === "pending" ? "amber" : "danger"}>
                      {PAYMENT_STATUS_LABEL[p.status as PaymentStatus]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {p.method === "pix" ? "Pix" : "Cartão de crédito"}
                    {p.method === "credit_card" && p.installments > 1 ? ` · ${p.installments}x` : ""}
                    {p.providerPaymentId ? ` · ${p.provider} ${p.providerPaymentId}` : ""}
                  </p>
                  {p.paidAt && <p className="mt-1 text-xs text-muted">Pago em {formatDate(p.paidAt, { dateStyle: "short", timeStyle: "short" })}</p>}
                </div>
              ))}
            </div>
          )}

          <h2 className="mt-6 font-serif text-lg text-ink">Histórico</h2>
          {order.history.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Sem histórico.</p>
          ) : (
            <ol className="mt-3 space-y-2.5">
              {order.history.map((h) => (
                <li key={h.id} className="text-sm">
                  <p className="text-ink">
                    {ORDER_STATUS_LABEL[h.toStatus as OrderStatus]}
                    {h.fromStatus && <span className="text-muted"> · a partir de {ORDER_STATUS_LABEL[h.fromStatus as OrderStatus]}</span>}
                  </p>
                  {h.note && <p className="text-xs text-muted">{h.note}</p>}
                  <p className="text-xs text-muted">{formatDate(h.createdAt, { dateStyle: "short", timeStyle: "short" })}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}