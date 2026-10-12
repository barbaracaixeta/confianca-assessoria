"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { savePriceTierAction, deletePriceTierAction, loadPriceTiersAction } from "./actions";
import { formatMoney } from "@/lib/utils";
import type { AdminPriceTierRow, AdminPricingProduct } from "@/lib/admin/pricing";

const emptyDraft = { minQuantity: 1, priceCents: 0 };

export function PriceTierManager({
  products,
  initialProductId,
  initialTiers,
}: {
  products: AdminPricingProduct[];
  initialProductId: string | null;
  initialTiers: AdminPriceTierRow[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialProductId);
  const [tiers, setTiers] = useState<AdminPriceTierRow[]>(initialTiers);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [d, setD] = useState(emptyDraft);

  const product = products.find((p) => p.id === selectedId) ?? null;
  const perPage = product?.pricingUnit === "per_page";
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Erro ao salvar.");
    router.refresh();
  }

  async function select(id: string) {
    setSelectedId(id);
    setEditingId(null);
    setOpen(false);
    setD(emptyDraft);
    setLoading(true);
    setError(null);
    const res = await loadPriceTiersAction({ productId: id });
    setLoading(false);
    if (!res.ok) return setError(res.error ?? "Não foi possível carregar as faixas.");
    setTiers(res.data);
  }

  function add() {
    setEditingId(null);
    setD(emptyDraft);
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function edit(row: AdminPriceTierRow) {
    setEditingId(row.id);
    setD({ minQuantity: row.minQuantity, priceCents: row.unitPriceCents });
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit() {
    if (!selectedId) return;
    const duplicate = tiers.some((t) => t.id !== editingId && t.minQuantity === d.minQuantity);
    if (duplicate) return setError("Já existe uma faixa com essa quantidade mínima.");
    void run(async () => {
      const res = await savePriceTierAction({
        id: editingId ?? undefined,
        productId: selectedId,
        minQuantity: d.minQuantity,
        unitPriceCents: d.priceCents,
      });
      if (res.ok) {
        const row: AdminPriceTierRow = {
          id: res.data.id,
          productId: selectedId,
          minQuantity: d.minQuantity,
          unitPriceCents: d.priceCents,
          createdAt: new Date().toISOString(),
        };
        setTiers((ts) => {
          const next = editingId ? ts.map((t) => (t.id === editingId ? { ...t, ...row } : t)) : [...ts, row];
          return [...next].sort((a, b) => a.minQuantity - b.minQuantity);
        });
        setOpen(false);
        setEditingId(null);
        setD(emptyDraft);
      }
      return res;
    });
  }

  function remove(row: AdminPriceTierRow) {
    if (!selectedId) return;
    if (!confirm(`Remover a faixa de ${row.minQuantity} ${perPage ? "páginas" : "unidades"} por ${formatMoney(row.unitPriceCents)}?`)) return;
    void run(async () => {
      const res = await deletePriceTierAction({ id: row.id, productId: selectedId });
      if (res.ok) setTiers((ts) => ts.filter((t) => t.id !== row.id));
      return res;
    });
  }

  return (
    <div className="mt-8 max-w-[880px] space-y-6">
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}

      {products.length === 0 ? (
        <p className="text-sm text-muted">Nenhum produto cadastrado. Crie um produto para configurar faixas de preço.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Produto">
              {(props) => (
                <Select {...props} value={selectedId ?? ""} onChange={(e) => select(e.target.value)} disabled={loading}>
                  {initialProductId === null && <option value="">Selecione um produto</option>}
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.pricingUnit === "per_page" ? " (por página)" : ""}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex justify-end">
              {open ? (
                <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
              ) : (
                <Button onClick={add} disabled={!selectedId}>Nova faixa</Button>
              )}
            </div>
          </div>

          {product && (
            <p className="text-sm text-muted">
              {perPage ? "Preço cobrado por página — cada faixa vale a partir da quantidade mínima." : "Preço fixo por unidade — cada faixa vale a partir da quantidade mínima."}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-muted">Carregando faixas...</p>
          ) : (
            <>
              {open && (
                <section className="space-y-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Quantidade mínima">
                      {(props) => (
                        <Input
                          {...props}
                          type="number"
                          min={1}
                          value={d.minQuantity}
                          onChange={(e) => setD({ ...d, minQuantity: Number(e.target.value) || 0 })}
                          autoFocus
                        />
                      )}
                    </Field>
                    <Field label="Preço unitário (R$)" hint={perPage ? "Valor por página" : "Valor por unidade"}>
                      {(props) => (
                        <Input
                          {...props}
                          type="number"
                          min={0}
                          step="0.01"
                          value={(d.priceCents / 100).toFixed(2).replace(".", ",")}
                          onChange={(e) => setD({ ...d, priceCents: Math.round(Number(e.target.value.replace(/\./g, "").replace(",", ".")) * 100) || 0 })}
                        />
                      )}
                    </Field>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={submit} loading={busy} disabled={d.minQuantity < 1}>
                      {editingId ? "Salvar faixa" : "Adicionar faixa"}
                    </Button>
                  </div>
                </section>
              )}

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="pb-2 font-normal">Quantidade mínima</th>
                    <th className="pb-2 font-normal">Preço unitário</th>
                    <th className="pb-2 text-right font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t) => (
                    <tr key={t.id} className="border-b border-line last:border-0">
                      <td className="py-3 tabular">
                        {t.minQuantity} {perPage ? `página${t.minQuantity === 1 ? "" : "s"}` : `unidade${t.minQuantity === 1 ? "" : "s"}`}
                      </td>
                      <td className="py-3 tabular">
                        {formatMoney(t.unitPriceCents)}
                        {perPage && <span className="text-muted">/página</span>}
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => edit(t)}>Editar</Button>{" "}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => remove(t)}
                          loading={busy}
                        >
                          Remover
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-sm text-muted">Nenhuma faixa definida para este produto ainda. Adicione a primeira para cobrar por quantidade.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  );
}