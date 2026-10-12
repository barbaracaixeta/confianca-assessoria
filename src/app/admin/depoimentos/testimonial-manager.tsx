"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/feedback";
import { saveTestimonialAction, toggleTestimonialAction, deleteTestimonialAction } from "./actions";
import type { AdminTestimonialRow, ProductOption } from "@/lib/admin/content";

interface Draft {
  id?: string;
  authorName: string;
  authorDetail: string;
  photoPath: string;
  body: string;
  productId: string;
  rating: string;
  isActive: boolean;
  sortOrder: number;
}

const emptyDraft: Draft = {
  authorName: "",
  authorDetail: "",
  photoPath: "",
  body: "",
  productId: "",
  rating: "",
  isActive: true,
  sortOrder: 0,
};

export function TestimonialManager({ initial, products }: { initial: AdminTestimonialRow[]; products: ProductOption[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AdminTestimonialRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Draft>(emptyDraft);

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
      const res = await saveTestimonialAction({
        id: d.id,
        authorName: d.authorName,
        authorDetail: d.authorDetail || null,
        photoPath: d.photoPath || null,
        body: d.body,
        productId: d.productId || null,
        rating: d.rating === "" ? null : Number(d.rating),
        isActive: d.isActive,
        sortOrder: d.sortOrder,
      });
      if (res.ok) {
        setOpen(false);
        setD(emptyDraft);
      }
      return res;
    });
  }

  function edit(row: AdminTestimonialRow) {
    setD({
      id: row.id,
      authorName: row.authorName,
      authorDetail: row.authorDetail ?? "",
      photoPath: row.photoPath ?? "",
      body: row.body,
      productId: row.productId ?? "",
      rating: row.rating === null ? "" : String(row.rating),
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    });
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mt-8 max-w-[880px] space-y-6">
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}

      <div className="flex justify-end">
        {open ? <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button> : <Button onClick={() => { setD(emptyDraft); setOpen(true); }}>Novo depoimento</Button>}
      </div>

      {open && (
        <section className="space-y-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Autor">
              {(props) => <Input {...props} value={d.authorName} onChange={(e) => setD({ ...d, authorName: e.target.value })} autoFocus />}
            </Field>
            <Field label="Detalhe do autor" optional hint="Ex.: aluna de TCC, Universidade X">
              {(props) => <Input {...props} value={d.authorDetail} onChange={(e) => setD({ ...d, authorDetail: e.target.value })} />}
            </Field>
          </div>
          <Field label="Depoimento">
            {(props) => <Textarea {...props} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Produto relacionado" optional>
              {(props) => (
                <Select {...props} value={d.productId} onChange={(e) => setD({ ...d, productId: e.target.value })}>
                  <option value="">Sem produto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Nota" optional hint="1 a 5 estrelas.">
              {(props) => (
                <Select {...props} value={d.rating} onChange={(e) => setD({ ...d, rating: e.target.value })}>
                  <option value="">Sem nota</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="Foto (caminho ou URL)" optional>
            {(props) => <Input {...props} value={d.photoPath} onChange={(e) => setD({ ...d, photoPath: e.target.value })} />}
          </Field>
          <Field label="Ordem" optional hint="Menores aparecem primeiro.">
            {(props) => <Input {...props} type="number" min={0} value={d.sortOrder} onChange={(e) => setD({ ...d, sortOrder: Number(e.target.value) || 0 })} />}
          </Field>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} className="mt-0.5 size-4 accent-pine" />
            <span>
              <span className="font-medium text-ink">Depoimento ativo</span>
              <span className="mt-0.5 block text-xs text-muted">Exibe o depoimento na página inicial.</span>
            </span>
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} loading={busy} disabled={!d.authorName.trim() || !d.body.trim()}>
              {d.id ? "Salvar depoimento" : "Criar depoimento"}
            </Button>
          </div>
        </section>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="pb-2 font-normal">Autor</th>
            <th className="pb-2 font-normal">Produto</th>
            <th className="pb-2 text-right font-normal">Nota</th>
            <th className="pb-2 text-right font-normal">Ordem</th>
            <th className="pb-2 text-right font-normal">Status</th>
            <th className="pb-2 text-right font-normal">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              <td className="py-3">
                <span className="font-medium text-ink">{r.authorName}</span>
                {r.authorDetail && <span className="block text-xs text-muted">{r.authorDetail}</span>}
              </td>
              <td className="py-3 text-muted">{r.productName ?? "—"}</td>
              <td className="py-3 text-right tabular">{r.rating === null ? "—" : r.rating}</td>
              <td className="py-3 text-right tabular">{r.sortOrder}</td>
              <td className="py-3 text-right">
                <Badge tone={r.isActive ? "green" : "neutral"}>{r.isActive ? "Ativo" : "Pausado"}</Badge>
              </td>
              <td className="py-3 text-right">
                <Button variant="ghost" size="sm" loading={busy} onClick={() => run(async () => {
                  const res = await toggleTestimonialAction({ id: r.id, isActive: !r.isActive });
                  if (res.ok) setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, isActive: !r.isActive } : x)));
                  return res;
                })}>
                  {r.isActive ? "Pausar" : "Ativar"}
                </Button>{" "}
                <Button variant="ghost" size="sm" onClick={() => edit(r)}>Editar</Button>{" "}
                <Button variant="danger" size="sm" onClick={() => {
                  if (!confirm(`Remover o depoimento de ${r.authorName}?`)) return;
                  void run(async () => {
                    const res = await deleteTestimonialAction({ id: r.id });
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
              <td colSpan={6} className="py-6 text-sm text-muted">Nenhum depoimento ainda. Cadastre o primeiro para exibir prova social na página inicial.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
