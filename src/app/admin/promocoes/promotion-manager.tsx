"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { savePromotionAction, togglePromotionAction, deletePromotionAction } from "./actions";
import { formatMoney } from "@/lib/utils";
import type { AdminPromotionRow, AdminPromotionProductOption } from "@/lib/admin/promotions";

interface Draft {
  id?: string;
  name: string;
  description: string;
  bannerPath: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  couponCode: string;
  startsAt: string;
  endsAt: string;
  appliesToAll: boolean;
  isActive: boolean;
  productIds: string[];
}

const emptyDraft: Draft = {
  name: "",
  description: "",
  bannerPath: "",
  discountType: "percent",
  discountValue: 10,
  couponCode: "",
  startsAt: "",
  endsAt: "",
  appliesToAll: true,
  isActive: true,
  productIds: [],
};

export function PromotionManager({ initial, products }: { initial: AdminPromotionRow[]; products: AdminPromotionProductOption[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AdminPromotionRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Draft>({ ...emptyDraft });

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Erro ao salvar.");
    router.refresh();
  }

  function submit() {
    if (!d.appliesToAll && d.productIds.length === 0) {
      setError("Selecione ao menos um produto para a promoção.");
      return;
    }
    void run(async () => {
      const res = await savePromotionAction({
        id: d.id,
        name: d.name,
        description: d.description || null,
        bannerPath: d.bannerPath || null,
        discountType: d.discountType,
        discountValue: d.discountType === "percent" ? d.discountValue : Math.round(d.discountValue * 100),
        couponCode: d.couponCode.trim() ? d.couponCode.trim().toUpperCase() : null,
        startsAt: d.startsAt,
        endsAt: d.endsAt,
        appliesToAll: d.appliesToAll,
        isActive: d.isActive,
        productIds: d.appliesToAll ? [] : d.productIds,
      });
      if (res.ok) {
        setOpen(false);
        setD({ ...emptyDraft });
      }
      return res;
    });
  }

  function edit(row: AdminPromotionRow) {
    setD({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      bannerPath: row.bannerPath ?? "",
      discountType: row.discountType as Draft["discountType"],
      discountValue: row.discountType === "percent" ? row.discountValue : Math.round(row.discountValue / 100) || 1,
      couponCode: row.couponCode ?? "",
      startsAt: new Date(row.startsAt).toISOString().slice(0, 16),
      endsAt: new Date(row.endsAt).toISOString().slice(0, 16),
      appliesToAll: row.appliesToAll,
      isActive: row.isActive,
      productIds: row.productIds,
    });
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mt-8 max-w-[880px] space-y-6">
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}

      <div className="flex justify-end">
        {open ? <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button> : <Button onClick={() => { setD({ ...emptyDraft }); setOpen(true); }}>Nova promoção</Button>}
      </div>

      {open && (
        <section className="space-y-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
          <Field label="Nome">
            {(props) => (
              <Input {...props} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Black Friday" autoFocus />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de desconto">
              {(props) => (
                <Select {...props} value={d.discountType} onChange={(e) => setD({ ...d, discountType: e.target.value as Draft["discountType"] })}>
                  <option value="percent">Porcentagem (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </Select>
              )}
            </Field>
            <Field label={d.discountType === "percent" ? "Desconto (%)" : "Desconto (R$)"}>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={1}
                  max={d.discountType === "percent" ? 100 : undefined}
                  value={d.discountValue}
                  onChange={(e) => setD({ ...d, discountValue: Number(e.target.value) || 0 })}
                />
              )}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Começa em">
              {(props) => <Input {...props} type="datetime-local" value={d.startsAt} onChange={(e) => setD({ ...d, startsAt: e.target.value })} />}
            </Field>
            <Field label="Termina em">
              {(props) => <Input {...props} type="datetime-local" value={d.endsAt} onChange={(e) => setD({ ...d, endsAt: e.target.value })} />}
            </Field>
          </div>
          <Field label="Código de cupom" optional hint="Cupom necessário para acionar a promoção no checkout.">
            {(props) => (
              <Input
                {...props}
                value={d.couponCode}
                onChange={(e) => setD({ ...d, couponCode: e.target.value.toUpperCase() })}
                placeholder="BEMVINDO10"
                className="uppercase placeholder:normal-case"
              />
            )}
          </Field>
          <Field label="Imagem do banner (caminho)" optional>
            {(props) => <Input {...props} value={d.bannerPath} onChange={(e) => setD({ ...d, bannerPath: e.target.value })} placeholder="/promos/black-friday.png" />}
          </Field>
          <Field label="Descrição (interna)" optional>
            {(props) => <Textarea {...props} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} className="min-h-16" />}
          </Field>
          <ul className="space-y-2 text-sm">
            {(
              [
                ["isActive", "Promoção ativa", "Aplica o desconto enquanto o prazo estiver válido."],
                ["appliesToAll", "Aplicar a todos os produtos", "Quando desmarcado, você escolhe os produtos incluídos."],
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
          {!d.appliesToAll && (
            <div>
              <p className="text-sm font-medium text-ink">Produtos incluídos</p>
              <div className="mt-2 max-h-56 overflow-y-auto rounded-[var(--radius-sm)] border border-line bg-paper p-3">
                {products.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum produto cadastrado.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {products.map((p) => (
                      <li key={p.id}>
                        <label className="flex items-center gap-2 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={d.productIds.includes(p.id)}
                            onChange={(e) =>
                              setD((dd) => ({
                                ...dd,
                                productIds: e.target.checked ? [...dd.productIds, p.id] : dd.productIds.filter((x) => x !== p.id),
                              }))
                            }
                            className="size-4 accent-pine"
                          />
                          {p.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {d.productIds.length > 0 && <p className="mt-1 text-xs text-muted">{d.productIds.length} produto{d.productIds.length === 1 ? "" : "s"} selecionado{d.productIds.length === 1 ? "" : "s"}</p>}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} loading={busy} disabled={!d.name.trim() || !d.startsAt || !d.endsAt}>
              {d.id ? "Salvar promoção" : "Criar promoção"}
            </Button>
          </div>
        </section>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="pb-2 font-normal">Promoção</th>
            <th className="pb-2 font-normal">Desconto</th>
            <th className="pb-2 font-normal">Vigência</th>
            <th className="pb-2 font-normal">Escopo</th>
            <th className="pb-2 text-right font-normal">Ativo</th>
            <th className="pb-2 text-right font-normal">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              <td className="py-3">
                <span className="font-medium text-ink">{r.name}</span>
                {r.description && <span className="block text-xs text-muted">{r.description}</span>}
                {r.couponCode && <span className="block text-xs text-pine">Código {r.couponCode}</span>}
              </td>
              <td className="py-3 tabular">{r.discountType === "percent" ? `${r.discountValue}%` : formatMoney(r.discountValue)}</td>
              <td className="py-3 tabular text-muted">
                {new Date(r.startsAt).toLocaleDateString("pt-BR")} → {new Date(r.endsAt).toLocaleDateString("pt-BR")}
              </td>
              <td className="py-3 text-ink-2">{r.appliesToAll ? "Todos os produtos" : `${r.productCount} produto${r.productCount === 1 ? "" : "s"}`}</td>
              <td className="py-3 text-right">
                <Button variant="ghost" size="sm" loading={busy} onClick={() => run(async () => {
                  const res = await togglePromotionAction({ id: r.id, isActive: !r.isActive });
                  if (res.ok) setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, isActive: !r.isActive } : x)));
                  return res;
                })}>
                  {r.isActive ? "Pausar" : "Ativar"}
                </Button>
              </td>
              <td className="py-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => edit(r)}>Editar</Button>{" "}
                <Button variant="danger" size="sm" onClick={() => {
                  if (!confirm(`Remover a promoção "${r.name}"?`)) return;
                  void run(async () => {
                    const res = await deletePromotionAction({ id: r.id });
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
              <td colSpan={6} className="py-6 text-sm text-muted">Nenhuma promoção ainda. Crie a primeira para oferecer descontos no prazo desejado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}