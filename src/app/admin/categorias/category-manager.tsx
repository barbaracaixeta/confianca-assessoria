"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { saveCategoryAction, toggleCategoryAction, deleteCategoryAction } from "./actions";
import { slugify } from "@/lib/utils";
import type { AdminCategoryRow } from "@/lib/admin/catalog";

interface RowLike extends AdminCategoryRow {
  editing?: boolean;
}

export function CategoryManager({ initial }: { initial: AdminCategoryRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<RowLike[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", slug: "", description: "" });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Erro ao salvar.");
    router.refresh();
  }

  async function create() {
    await run(async () => {
      const res = await saveCategoryAction({
        name: draft.name,
        slug: slugify(draft.slug || draft.name),
        description: draft.description || null,
        sortOrder: rows.length,
        isActive: true,
      });
      if (res.ok) {
        setDraft({ name: "", slug: "", description: "" });
        setCreating(false);
      }
      return res;
    });
  }

  function apply(id: string, patch: Partial<RowLike>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(r: RowLike) {
    setBusyId(r.id);
    const draft = { name: r.name, slug: r.slug, description: r.description || null, sortOrder: r.sortOrder, isActive: r.isActive };
    const res = await saveCategoryAction({ id: r.id, ...draft });
    setBusyId(null);
    if (!res.ok) return setError(res.error);
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, editing: false, name: r.name, slug: r.slug, description: r.description, sortOrder: r.sortOrder } : x)));
    router.refresh();
  }

  return (
    <div className="mt-8 max-w-[880px] space-y-6">
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}

      <div className="flex justify-end">
        {creating ? (
          <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
        ) : (
          <Button onClick={() => setCreating(true)}>Nova categoria</Button>
        )}
      </div>

      {creating && (
        <section className="space-y-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
          <Field label="Nome">
            {(props) => (
              <Input
                {...props}
                value={draft.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) => ({ ...d, name: v, slug: d.slug ? d.slug : v }));
                }}
                autoFocus
              />
            )}
          </Field>
          <Field label="Slug (gerado automaticamente)" hint="Ex.: tcc, artigos, abnt">
            {(props) => <Input {...props} value={slugify(draft.slug)} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} />}
          </Field>
          <Field label="Descrição" optional>
            {(props) => <Textarea {...props} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />}
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={create} loading={busy} disabled={!draft.name.trim()}>Criar categoria</Button>
          </div>
        </section>
      )}

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-[var(--radius-sm)] border border-line bg-sheet p-4">
            {r.editing ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome">
                    {(props) => <Input {...props} value={r.name} onChange={(e) => apply(r.id, { name: e.target.value, slug: slugify(e.target.value) })} />}
                  </Field>
                  <Field label="Slug">
                    {(props) => <Input {...props} value={r.slug} onChange={(e) => apply(r.id, { slug: e.target.value })} />}
                  </Field>
                </div>
                <Field label="Descrição" optional>
                  {(props) => <Textarea {...props} value={r.description ?? ""} onChange={(e) => apply(r.id, { description: e.target.value })} />}
                </Field>
                <Field label="Ordem" optional>
                  {(props) => <Input {...props} type="number" min={0} value={r.sortOrder} onChange={(e) => apply(r.id, { sortOrder: Number(e.target.value) || 0 })} />}
                </Field>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => apply(r.id, { editing: false })}>Cancelar</Button>
                  <Button onClick={() => saveRow(r)} loading={busyId === r.id}>Salvar</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{r.name} <span className="text-xs font-normal text-muted">/categoria/{r.slug}</span></p>
                  <p className="text-xs text-muted">
                    {r.productCount} produto{r.productCount === 1 ? "" : "s"}
                    {r.isActive ? "" : " · oculta"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => apply(r.id, { editing: true })}>Editar</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busyId === r.id}
                    onClick={() =>
                      run(async () => {
                        const res = await toggleCategoryAction({ id: r.id, isActive: !r.isActive, slug: r.slug });
                        if (res.ok) apply(r.id, { isActive: !r.isActive });
                        return res;
                      })
                    }
                  >
                    {r.isActive ? "Ocultar" : "Publicar"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (!confirm(`Remover a categoria "${r.name}"? Os produtos dela ficam sem categoria.`)) return;
                      run(async () => {
                        const res = await deleteCategoryAction({ id: r.id, slug: r.slug });
                        if (res.ok) setRows((rs) => rs.filter((x) => x.id !== r.id));
                        return res;
                      });
                    }}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}