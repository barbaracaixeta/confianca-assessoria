"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/feedback";
import { saveBannerAction, toggleBannerAction, deleteBannerAction } from "./actions";
import type { AdminBannerRow } from "@/lib/admin/content";

interface Draft {
  id?: string;
  title: string;
  subtitle: string;
  imagePath: string;
  ctaLabel: string;
  ctaHref: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  sortOrder: number;
}

const emptyDraft: Draft = {
  title: "",
  subtitle: "",
  imagePath: "",
  ctaLabel: "",
  ctaHref: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
  sortOrder: 0,
};

export function BannerManager({ initial }: { initial: AdminBannerRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AdminBannerRow[]>(initial);
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
      const res = await saveBannerAction({
        id: d.id,
        title: d.title,
        subtitle: d.subtitle || null,
        imagePath: d.imagePath || null,
        ctaLabel: d.ctaLabel || null,
        ctaHref: d.ctaHref || null,
        startsAt: d.startsAt || null,
        endsAt: d.endsAt || null,
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

  function edit(row: AdminBannerRow) {
    setD({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle ?? "",
      imagePath: row.imagePath ?? "",
      ctaLabel: row.ctaLabel ?? "",
      ctaHref: row.ctaHref ?? "",
      startsAt: row.startsAt ? new Date(row.startsAt).toISOString().slice(0, 16) : "",
      endsAt: row.endsAt ? new Date(row.endsAt).toISOString().slice(0, 16) : "",
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
        {open ? <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button> : <Button onClick={() => { setD(emptyDraft); setOpen(true); }}>Novo banner</Button>}
      </div>

      {open && (
        <section className="space-y-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
          <Field label="Título">
            {(props) => <Input {...props} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} autoFocus />}
          </Field>
          <Field label="Subtítulo" optional>
            {(props) => <Textarea {...props} value={d.subtitle} onChange={(e) => setD({ ...d, subtitle: e.target.value })} className="min-h-16" />}
          </Field>
          <Field label="Caminho ou URL da imagem" optional hint="Ex.: catalogo/banner-1.jpg ou https://...">
            {(props) => <Input {...props} value={d.imagePath} onChange={(e) => setD({ ...d, imagePath: e.target.value })} placeholder="banners/volta-as-aulas.jpg" />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Texto do botão" optional>
              {(props) => <Input {...props} value={d.ctaLabel} onChange={(e) => setD({ ...d, ctaLabel: e.target.value })} placeholder="Ver oferta" />}
            </Field>
            <Field label="Link do botão" optional>
              {(props) => <Input {...props} value={d.ctaHref} onChange={(e) => setD({ ...d, ctaHref: e.target.value })} placeholder="/loja" />}
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
          <Field label="Ordem" optional hint="Menores aparecem primeiro.">
            {(props) => <Input {...props} type="number" min={0} value={d.sortOrder} onChange={(e) => setD({ ...d, sortOrder: Number(e.target.value) || 0 })} />}
          </Field>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} className="mt-0.5 size-4 accent-pine" />
            <span>
              <span className="font-medium text-ink">Banner ativo</span>
              <span className="mt-0.5 block text-xs text-muted">Exibe o banner na página inicial quando estiver vigente.</span>
            </span>
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} loading={busy} disabled={!d.title.trim()}>
              {d.id ? "Salvar banner" : "Criar banner"}
            </Button>
          </div>
        </section>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="pb-2 font-normal">Título</th>
            <th className="pb-2 font-normal">Botão</th>
            <th className="pb-2 font-normal">Vigência</th>
            <th className="pb-2 text-right font-normal">Ordem</th>
            <th className="pb-2 text-right font-normal">Status</th>
            <th className="pb-2 text-right font-normal">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              <td className="py-3">
                <span className="font-medium text-ink">{r.title}</span>
                {r.subtitle && <span className="block text-xs text-muted">{r.subtitle}</span>}
              </td>
              <td className="py-3 text-muted">{r.ctaLabel || "—"}</td>
              <td className="py-3 tabular text-muted">
                {r.startsAt || r.endsAt
                  ? `${r.startsAt ? new Date(r.startsAt).toLocaleDateString("pt-BR") : "—"} a ${r.endsAt ? new Date(r.endsAt).toLocaleDateString("pt-BR") : "—"}`
                  : "sem prazo"}
              </td>
              <td className="py-3 text-right tabular">{r.sortOrder}</td>
              <td className="py-3 text-right">
                <Badge tone={r.isActive ? "green" : "neutral"}>{r.isActive ? "Ativo" : "Pausado"}</Badge>
              </td>
              <td className="py-3 text-right">
                <Button variant="ghost" size="sm" loading={busy} onClick={() => run(async () => {
                  const res = await toggleBannerAction({ id: r.id, isActive: !r.isActive });
                  if (res.ok) setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, isActive: !r.isActive } : x)));
                  return res;
                })}>
                  {r.isActive ? "Pausar" : "Ativar"}
                </Button>{" "}
                <Button variant="ghost" size="sm" onClick={() => edit(r)}>Editar</Button>{" "}
                <Button variant="danger" size="sm" onClick={() => {
                  if (!confirm(`Remover o banner "${r.title}"?`)) return;
                  void run(async () => {
                    const res = await deleteBannerAction({ id: r.id });
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
              <td colSpan={6} className="py-6 text-sm text-muted">Nenhum banner ainda. Crie o primeiro para destacar ofertas na página inicial.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
