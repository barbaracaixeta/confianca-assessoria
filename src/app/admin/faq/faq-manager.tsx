"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/feedback";
import { saveFaqAction, toggleFaqAction, deleteFaqAction } from "./actions";
import type { AdminFaqRow } from "@/lib/admin/content";

interface Draft {
  id?: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

const emptyDraft: Draft = {
  question: "",
  answer: "",
  category: "geral",
  sortOrder: 0,
  isActive: true,
};

export function FaqManager({ initial }: { initial: AdminFaqRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AdminFaqRow[]>(initial);
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
      const res = await saveFaqAction({
        id: d.id,
        question: d.question,
        answer: d.answer,
        category: d.category.trim() || "geral",
        sortOrder: d.sortOrder,
        isActive: d.isActive,
      });
      if (res.ok) {
        setOpen(false);
        setD(emptyDraft);
      }
      return res;
    });
  }

  function edit(row: AdminFaqRow) {
    setD({
      id: row.id,
      question: row.question,
      answer: row.answer,
      category: row.category,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    });
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mt-8 max-w-[880px] space-y-6">
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}

      <div className="flex justify-end">
        {open ? <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button> : <Button onClick={() => { setD(emptyDraft); setOpen(true); }}>Nova pergunta</Button>}
      </div>

      {open && (
        <section className="space-y-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
          <Field label="Pergunta">
            {(props) => <Input {...props} value={d.question} onChange={(e) => setD({ ...d, question: e.target.value })} autoFocus />}
          </Field>
          <Field label="Resposta">
            {(props) => <Textarea {...props} value={d.answer} onChange={(e) => setD({ ...d, answer: e.target.value })} className="min-h-32" />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria" hint="Ex.: geral, pagamento, prazos">
              {(props) => <Input {...props} value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} />}
            </Field>
            <Field label="Ordem" optional hint="Menores aparecem primeiro.">
              {(props) => <Input {...props} type="number" min={0} value={d.sortOrder} onChange={(e) => setD({ ...d, sortOrder: Number(e.target.value) || 0 })} />}
            </Field>
          </div>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} className="mt-0.5 size-4 accent-pine" />
            <span>
              <span className="font-medium text-ink">Pergunta ativa</span>
              <span className="mt-0.5 block text-xs text-muted">Exibe a pergunta na seção de dúvidas do site.</span>
            </span>
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} loading={busy} disabled={!d.question.trim() || !d.answer.trim()}>
              {d.id ? "Salvar pergunta" : "Criar pergunta"}
            </Button>
          </div>
        </section>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="pb-2 font-normal">Pergunta</th>
            <th className="pb-2 font-normal">Categoria</th>
            <th className="pb-2 text-right font-normal">Ordem</th>
            <th className="pb-2 text-right font-normal">Status</th>
            <th className="pb-2 text-right font-normal">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              <td className="py-3">
                <span className="font-medium text-ink">{r.question}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs text-muted">{r.answer}</span>
              </td>
              <td className="py-3 text-muted">{r.category}</td>
              <td className="py-3 text-right tabular">{r.sortOrder}</td>
              <td className="py-3 text-right">
                <Badge tone={r.isActive ? "green" : "neutral"}>{r.isActive ? "Ativa" : "Oculta"}</Badge>
              </td>
              <td className="py-3 text-right">
                <Button variant="ghost" size="sm" loading={busy} onClick={() => run(async () => {
                  const res = await toggleFaqAction({ id: r.id, isActive: !r.isActive });
                  if (res.ok) setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, isActive: !r.isActive } : x)));
                  return res;
                })}>
                  {r.isActive ? "Ocultar" : "Publicar"}
                </Button>{" "}
                <Button variant="ghost" size="sm" onClick={() => edit(r)}>Editar</Button>{" "}
                <Button variant="danger" size="sm" onClick={() => {
                  if (!confirm("Remover esta pergunta?")) return;
                  void run(async () => {
                    const res = await deleteFaqAction({ id: r.id });
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
              <td colSpan={5} className="py-6 text-sm text-muted">Nenhuma pergunta ainda. Cadastre a primeira para responder as dúvidas mais comuns.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
