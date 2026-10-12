"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveCouponAction, toggleCouponAction, deleteCouponAction } from "./actions";
import { formatMoney } from "@/lib/utils";
import type { AdminCouponRow } from "@/lib/admin/catalog";

interface Draft {
  id?: string;
  code: string;
  description: string;
  type: "percent" | "fixed";
  value: number;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perCustomerLimit: string;
  minOrderCents: number;
  appliesToAll: boolean;
  firstOrderOnly: boolean;
  isActive: boolean;
}

export function CouponManager({ initial }: { initial: AdminCouponRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AdminCouponRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Draft>({
    code: "",
    description: "",
    type: "percent",
    value: 10,
    startsAt: "",
    endsAt: "",
    usageLimit: "",
    perCustomerLimit: "",
    minOrderCents: 0,
    appliesToAll: true,
    firstOrderOnly: false,
    isActive: true,
  });

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Erro ao salvar.");
    router.refresh();
  }

  function submit() {
    void run(async () => {
      const res = await saveCouponAction({
        id: d.id,
        code: d.code,
        description: d.description || null,
        type: d.type,
        value: d.value,
        startsAt: d.startsAt || null,
        endsAt: d.endsAt || null,
        usageLimit: d.usageLimit === "" ? null : Number(d.usageLimit) || null,
        perCustomerLimit: d.perCustomerLimit === "" ? null : Number(d.perCustomerLimit) || null,
        minOrderCents: d.minOrderCents,
        appliesToAll: d.appliesToAll,
        firstOrderOnly: d.firstOrderOnly,
        isActive: d.isActive,
      });
      if (res.ok) {
        setOpen(false);
        setD({ ...d, id: undefined, code: "", description: "", startsAt: "", endsAt: "", usageLimit: "", perCustomerLimit: "" });
      }
      return res;
    });
  }

  function edit(row: AdminCouponRow) {
    setD({
      id: row.id,
      code: row.code,
      description: row.description ?? "",
      type: row.type as Draft["type"],
      value: row.type === "percent" ? row.value : Math.round(row.value / 100) || 1,
      startsAt: "",
      endsAt: row.endsAt ? new Date(row.endsAt).toISOString().slice(0, 16) : "",
      usageLimit: row.usageLimit === null ? "" : String(row.usageLimit),
      perCustomerLimit: "",
      minOrderCents: 0,
      appliesToAll: true,
      firstOrderOnly: false,
      isActive: row.isActive,
    });
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mt-8 max-w-[880px] space-y-6">
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}

      <div className="flex justify-end">
        {open ? <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button> : <Button onClick={() => { setD({ ...d, id: undefined, code: "" }); setOpen(true); }}>Novo cupom</Button>}
      </div>

      {open && (
        <section className="space-y-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Código">
              {(props) => (
                <Input
                  {...props}
                  value={d.code}
                  onChange={(e) => setD({ ...d, code: e.target.value.toUpperCase() })}
                  placeholder="BEMVINDO10"
                  className="uppercase placeholder:normal-case"
                  autoFocus
                />
              )}
            </Field>
            <Field label="Tipo">
              {(props) => (
                <Select {...props} value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as Draft["type"] })}>
                  <option value="percent">Porcentagem (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </Select>
              )}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.type === "percent" ? "Valor (%)" : "Valor (R$)"}>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={1}
                  max={d.type === "percent" ? 100 : undefined}
                  value={d.value}
                  onChange={(e) => setD({ ...d, value: Number(e.target.value) || 0 })}
                />
              )}
            </Field>
            <Field label="Pedido mínimo (R$)" optional hint="0 = sem mínimo">
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={0}
                  step="0.01"
                  value={(d.minOrderCents / 100).toFixed(2).replace(".", ",")}
                  onChange={(e) => setD({ ...d, minOrderCents: Math.round(Number(e.target.value.replace(/\./g, "").replace(",", ".")) * 100) || 0 })}
                />
              )}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Começa em" optional>
              {(props) => <Input {...props} type="datetime-local" value={d.startsAt} onChange={(e) => setD({ ...d, startsAt: e.target.value })} />}
            </Field>
            <Field label="Termina em" optional>
              {(props) => <Input {...props} type="datetime-local" value={d.endsAt} onChange={(e) => setD({ ...d, endsAt: e.target.value })} />}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Limite total de usos" optional>
              {(props) => <Input {...props} type="number" min={1} value={d.usageLimit} onChange={(e) => setD({ ...d, usageLimit: e.target.value })} />}
            </Field>
            <Field label="Limite por cliente" optional>
              {(props) => <Input {...props} type="number" min={1} value={d.perCustomerLimit} onChange={(e) => setD({ ...d, perCustomerLimit: e.target.value })} />}
            </Field>
          </div>
          <Field label="Descrição (interna)" optional>
            {(props) => <Textarea {...props} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} className="min-h-16" />}
          </Field>
          <ul className="space-y-2 text-sm">
            {(
              [
                ["isActive", "Cupom ativo", "Habilita o código no checkout."],
                ["firstOrderOnly", "Só para a primeira compra", "Válido apenas no primeiro pedido do e-mail."],
              ] as const
            ).map(([key, label, hint]) => (
              <li key={key}>
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={d[key]} onChange={(e) => setD({ ...d, [key]: e.target.checked })} className="mt-0.5 size-4 accent-pine" />
                  <span>
                    <span className="font-medium text-ink">{label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} loading={busy} disabled={!d.code.trim()}>
              {d.id ? "Salvar cupom" : "Criar cupom"}
            </Button>
          </div>
        </section>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="pb-2 font-normal">Código</th>
            <th className="pb-2 font-normal">Desconto</th>
            <th className="pb-2 font-normal">Válido até</th>
            <th className="pb-2 text-right font-normal">Usos</th>
            <th className="pb-2 text-right font-normal">Ativo</th>
            <th className="pb-2 text-right font-normal">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              <td className="py-3">
                <span className="font-medium text-ink">{r.code}</span>
                {r.description && <span className="block text-xs text-muted">{r.description}</span>}
              </td>
              <td className="py-3 tabular">{r.type === "percent" ? `${r.value}%` : formatMoney(r.value)}</td>
              <td className="py-3 tabular text-muted">{r.endsAt ? new Date(r.endsAt).toLocaleDateString("pt-BR") : "sem prazo"}</td>
              <td className="py-3 text-right tabular">{r.usageLimit === null ? r.usageCount : `${r.usageCount}/${r.usageLimit}`}</td>
              <td className="py-3 text-right">
                <Button variant="ghost" size="sm" loading={busy} onClick={() => run(async () => {
                  const res = await toggleCouponAction({ id: r.id, isActive: !r.isActive });
                  if (res.ok) setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, isActive: !r.isActive } : x)));
                  return res;
                })}>
                  {r.isActive ? "Pausar" : "Ativar"}
                </Button>
              </td>
              <td className="py-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => edit(r)}>Editar</Button>{" "}
                <Button variant="danger" size="sm" onClick={() => {
                  if (!confirm(`Remover o cupom ${r.code}?`)) return;
                  void run(async () => {
                    const res = await deleteCouponAction({ id: r.id });
                    if (res.ok) setRows((rs) => rs.filter((x) => x.id !== r.id));
                    return res;
                  });
                }}>
                  Remover
                </Button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-sm text-muted">Nenhum cupom ainda. Crie o primeiro para oferecer descontos no checkout.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}