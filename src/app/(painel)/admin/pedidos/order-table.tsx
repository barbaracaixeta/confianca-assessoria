"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/field";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders/state-machine";
import { formatDate, formatMoney } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/types/domain";
import type { AdminOrderRow } from "@/lib/admin/orders";

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABEL) as [OrderStatus, string][];
const PAYMENT_OPTIONS = Object.entries(PAYMENT_STATUS_LABEL) as [PaymentStatus, string][];

export function OrderTable({ rows }: { rows: AdminOrderRow[] }) {
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (payment && r.paymentStatus !== payment) return false;
      if (q && !`${r.number} ${r.customerName} ${r.customerEmail}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, status, payment, query]);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Buscar</span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Número, cliente ou e-mail"
            className="h-9 w-64 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Status</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-52 text-sm">
            <option value="">Todos</option>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Pagamento</span>
          <Select value={payment} onChange={(e) => setPayment(e.target.value)} className="h-9 w-52 text-sm">
            <option value="">Todos</option>
            {PAYMENT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </label>
        <p className="ml-auto text-sm text-muted">
          {filtered.length} de {rows.length} pedidos
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="pb-2 font-normal">Pedido</th>
              <th className="pb-2 font-normal">Cliente</th>
              <th className="pb-2 text-right font-normal">Itens</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 font-normal">Pagamento</th>
              <th className="pb-2 text-right font-normal">Valor</th>
              <th className="pb-2 text-right font-normal">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="py-3">
                  <Link href={`/admin/pedidos/${o.id}`} className="font-medium tabular text-pine hover:underline">#{o.number}</Link>
                </td>
                <td className="py-3">
                  <span className="text-ink">{o.customerName || "—"}</span>
                  {o.customerEmail && <span className="block text-xs text-muted">{o.customerEmail}</span>}
                </td>
                <td className="py-3 text-right tabular text-ink-2">{o.itemsCount}</td>
                <td className="py-3 text-ink-2">{ORDER_STATUS_LABEL[o.status as OrderStatus]}</td>
                <td className="py-3">
                  <Badge tone={o.paymentStatus === "confirmed" || o.paymentStatus === "received" ? "green" : o.paymentStatus === "pending" ? "amber" : "danger"}>
                    {PAYMENT_STATUS_LABEL[o.paymentStatus as PaymentStatus]}
                  </Badge>
                </td>
                <td className="py-3 text-right tabular">{formatMoney(o.totalCents)}</td>
                <td className="py-3 text-right text-muted">{formatDate(o.createdAt, { dateStyle: "short" })}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-sm text-muted">Nenhum pedido encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
