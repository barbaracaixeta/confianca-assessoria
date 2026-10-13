"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input, Select } from "@/components/ui/field";

export function ProductFilters({
  institutions,
  categories,
}: {
  institutions: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("categoria") ?? "";
  const institution = searchParams.get("instituicao") ?? "";
  const status = searchParams.get("status") ?? "";
  const hasFilters = Boolean(q || category || institution || status);

  function patch(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/admin/produtos?${qs}` : "/admin/produtos", { scroll: false }));
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-line pb-6">
      <div className="relative min-w-[220px] flex-1">
        <Input
          type="search"
          value={q}
          onChange={(e) => patch({ q: e.target.value || null })}
          placeholder="Buscar por produto ou instituição…"
          aria-label="Buscar produtos"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        Categoria
        <Select value={category} onChange={(e) => patch({ categoria: e.target.value || null })} aria-label="Filtrar por categoria">
          <option value="">Todas</option>
          <option value="none">Sem categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        Instituição
        <Select value={institution} onChange={(e) => patch({ instituicao: e.target.value || null })} aria-label="Filtrar por instituição">
          <option value="">Todas</option>
          <option value="none">Sem instituição</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        Status
        <Select value={status} onChange={(e) => patch({ status: e.target.value || null })} aria-label="Filtrar por status">
          <option value="">Todos</option>
          <option value="published">Publicados</option>
          <option value="draft">Não publicados</option>
        </Select>
      </label>
      {hasFilters && (
        <button
          type="button"
          onClick={() => startTransition(() => router.push("/admin/produtos", { scroll: false }))}
          className="text-sm font-medium text-pine hover:underline"
        >
          Limpar filtros
        </button>
      )}
      {isPending && <span className="text-xs text-green">Atualizando…</span>}
    </div>
  );
}
