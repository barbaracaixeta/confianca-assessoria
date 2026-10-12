"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/feedback";
import { formatDate, formatMoney } from "@/lib/utils";
import { toggleCustomerActiveAction } from "./actions";
import type { AdminCustomerRow } from "@/lib/admin/customers";

export function CustomerManager({ rows, canManage }: { rows: AdminCustomerRow[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.fullName} ${r.email} ${r.cpfCnpj ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Erro ao salvar.");
    router.refresh();
  }

  return (
    <div className="mt-8">
      {error && <p className="mb-4 text-sm font-medium text-danger" role="alert">{error}</p>}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Buscar</span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, e-mail ou CPF/CNPJ"
            className="h-9 w-72 text-sm"
          />
        </label>
        <p className="ml-auto text-sm text-muted">{filtered.length} de {rows.length} clientes</p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="pb-2 font-normal">Cliente</th>
              <th className="pb-2 font-normal">Contato</th>
              <th className="pb-2 text-right font-normal">Pedidos</th>
              <th className="pb-2 text-right font-normal">Total gasto</th>
              <th className="pb-2 font-normal">Conta</th>
              <th className="pb-2 font-normal">Desde</th>
              {canManage && <th className="pb-2 text-right font-normal">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="py-3">
                  <Link href={`/admin/clientes/${c.id}`} className="font-medium text-pine hover:underline">{c.fullName || "—"}</Link>
                  {c.cpfCnpj && <span className="block text-xs tabular text-muted">{c.cpfCnpj}</span>}
                </td>
                <td className="py-3">
                  <span className="text-ink-2">{c.email}</span>
                  {c.phone && <span className="block text-xs tabular text-muted">{c.phone}</span>}
                </td>
                <td className="py-3 text-right tabular text-ink-2">
                  {c.ordersCount}
                  {c.paidOrdersCount > 0 && <span className="block text-xs text-muted">{c.paidOrdersCount} pagos</span>}
                </td>
                <td className="py-3 text-right tabular">{formatMoney(c.totalSpentCents)}</td>
                <td className="py-3">
                  <Badge tone={c.isActive ? "green" : "danger"}>{c.isActive ? "Ativa" : "Bloqueada"}</Badge>
                  {c.profileId && <span className="mt-1 block text-xs text-muted">conta vinculada</span>}
                </td>
                <td className="py-3 text-muted">{formatDate(c.createdAt, { dateStyle: "short" })}</td>
                {canManage && (
                  <td className="py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={busy}
                      onClick={() =>
                        void run(async () =>
                          toggleCustomerActiveAction({ id: c.id, isActive: !c.isActive }),
                        )
                      }
                    >
                      {c.isActive ? "Bloquear" : "Ativar"}
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="py-6 text-sm text-muted">Nenhum cliente encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
