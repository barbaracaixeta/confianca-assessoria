"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, control } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { FileTypeIcon } from "@/components/files/file-type-icon";
import { cn, formatBytes, slugify } from "@/lib/utils";
import { MAX_PRODUCT_FILE_SIZE_MB, extensionOf } from "@/lib/admin/product-files";
import { useUploadQueue } from "./use-upload-queue";
import {
  saveProductAction,
  removeProductFileAction,
  setProductCoverAction,
  regenerateProductPreviewAction,
  updateProductFileLabelAction,
  createProductFileUrlAction,
  type ProductDraft,
} from "./actions";

export interface AdminProductFile {
  id: string;
  original_name: string;
  mimeType: string;
  size_bytes: number | null;
  label: string;
  previewUrl: string | null;
  previewStatus: "pending" | "completed" | "fallback" | "failed" | null;
}

export interface AdminCategoryOption {
  id: string;
  name: string;
}

export interface AdminInstitutionOption {
  id: string;
  name: string;
  isActive: boolean;
}

export interface AdminProductValue {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string | null;
  institutionId: string | null;
  basePriceCents: number;
  discountType: ProductDraft["discountType"];
  discountValue: number;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
  productType: ProductDraft["productType"];
  deliveryDays: number;
  deliveryLabel: string | null;
  sku: string | null;
  stockQuantity: number | null;
  downloadLimit: number | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  benefits: string[];
  includes: string[];
}

const reais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const centsFrom = (v: string) => Math.round(Number(v.replace(/\./g, "").replace(",", ".")) * 100) || 0;

interface ComboBoxOption {
  id: string;
  name: string;
  note?: string;
}

/** Combobox pesquisável (busca por nome, valor = id). */
function ComboBox({
  id,
  options,
  value,
  onChange,
  emptyLabel,
  searchPlaceholder,
  ariaDescribedBy,
  invalid,
}: {
  id: string;
  options: ComboBoxOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  emptyLabel: string;
  searchPlaceholder: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const term = query.trim().toLowerCase();
  const filtered = term ? options.filter((o) => o.name.toLowerCase().includes(term)) : options;

  function choose(next: string | null) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid}
        onClick={() => setOpen((v) => !v)}
        className={cn(control, "flex h-11 items-center justify-between text-left")}
      >
        <span className={selected ? "text-ink" : "text-muted"}>{selected ? selected.name : emptyLabel}</span>
        <span aria-hidden="true" className="text-muted">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-[var(--radius-sm)] border border-line bg-sheet p-2 shadow-[var(--shadow-md)]">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9"
            aria-label={searchPlaceholder}
          />
          <ul id={`${id}-listbox`} role="listbox" className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => choose(null)}
                className={cn("w-full rounded-[var(--radius-xs)] px-2.5 py-2 text-left text-sm", !value ? "bg-green-50 text-pine" : "text-ink-2 hover:bg-paper")}
              >
                {emptyLabel}
              </button>
            </li>
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === value}
                  onClick={() => choose(o.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[var(--radius-xs)] px-2.5 py-2 text-left text-sm",
                    o.id === value ? "bg-green-50 text-pine" : "text-ink-2 hover:bg-paper",
                  )}
                >
                  {o.name}
                  {o.note && <span className="text-xs text-muted">{o.note}</span>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-2.5 py-2 text-sm text-muted">Nenhum resultado encontrado.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ProductForm({ product, categories, institutions }: { product: AdminProductValue; categories: AdminCategoryOption[]; institutions: AdminInstitutionOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(product.slug));
  const [f, set] = useState(product);

  const slug = useMemo(() => {
    if (slugTouched) return f.slug;
    return slugify(f.name);
  }, [f.slug, f.name, slugTouched]);

  const setField = <K extends keyof AdminProductValue>(key: K, value: AdminProductValue[K]) => set((p) => ({ ...p, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const draft: ProductDraft = {
      ...f,
      slug,
      benefits: f.benefits.filter(Boolean),
      includes: f.includes.filter(Boolean),
    };
    const res = await saveProductAction(draft);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    // Produto recém-criado vai direto à edição, onde fica o botão de enviar arquivos.
    if (!product.id && res.data.id) router.push(`/admin/produtos/editar/${res.data.id}`);
    else router.push("/admin/produtos?ok=1");
  }

  return (
    <form onSubmit={submit} className="space-y-12">
      {error && <Alert tone="danger" role="alert">{error}</Alert>}

      {/* Identidade */}
      <section className="space-y-5">
        <h2 className="text-[1.5rem] text-ink">Identidade</h2>
        <Field label="Nome" error={f.name.trim() && f.name.trim().length < 2 ? "Informe o nome." : undefined}>
          {(props) => <Input {...props} value={f.name} onChange={(e) => setField("name", e.target.value)} placeholder="Modelo de TCC em Word" required />}
        </Field>
        <Field label="Endereço (slug)" hint="Tudo minúsculo, com hífens. Preenchido automaticamente a partir do nome.">
          {(props) => (
            <Input
              {...props}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setField("slug", slugify(e.target.value));
              }}
              onFocus={() => setSlugTouched(true)}
              className={slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? "border-danger" : undefined}
              required
            />
          )}
        </Field>
        <Field label="Categoria">
          {(props) => (
            <ComboBox
              id={props.id}
              options={categories}
              value={f.categoryId}
              onChange={(id) => setField("categoryId", id)}
              emptyLabel="Sem categoria"
              searchPlaceholder="Buscar categoria…"
              ariaDescribedBy={props["aria-describedby"]}
              invalid={props["aria-invalid"]}
            />
          )}
        </Field>
        <Field label="Instituição" hint="Opcional. Filtro independente das categorias.">
          {(props) => (
            <ComboBox
              id={props.id}
              options={institutions.map((i) => ({ id: i.id, name: i.name, note: i.isActive ? undefined : "oculta" }))}
              value={f.institutionId}
              onChange={(id) => setField("institutionId", id)}
              emptyLabel="Sem instituição"
              searchPlaceholder="Buscar instituição…"
              ariaDescribedBy={props["aria-describedby"]}
              invalid={props["aria-invalid"]}
            />
          )}
        </Field>
        <Field label="Resumo da vitrine" hint="Uma frase curta exibida no catálogo e nos cards.">
          {(props) => <Input {...props} value={f.shortDescription} onChange={(e) => setField("shortDescription", e.target.value)} maxLength={240} />}
        </Field>
        <Field label="Descrição completa">
          {(props) => <Textarea {...props} value={f.description} onChange={(e) => setField("description", e.target.value)} className="min-h-40" />}
        </Field>
      </section>

      {/* Preço */}
      <section className="space-y-5">
        <h2 className="text-[1.5rem] text-ink">Preço e promoção</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Preço base (R$)">
            {(props) => <Input {...props} inputMode="decimal" value={reais(f.basePriceCents)} onChange={(e) => setField("basePriceCents", centsFrom(e.target.value))} />}
          </Field>
          <Field label="Tipo de desconto">
            {(props) => (
              <Select {...props} value={f.discountType} onChange={(e) => setField("discountType", e.target.value as ProductDraft["discountType"])}>
                <option value="none">Sem desconto</option>
                <option value="percent">Porcentagem (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
                <option value="sale_price">Preço promocional (R$)</option>
              </Select>
            )}
          </Field>
        </div>
        {f.discountType !== "none" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={f.discountType === "percent" ? "Desconto (%)" : f.discountType === "fixed" ? "Desconto (R$)" : "Preço promocional (R$)"}
              error={f.discountType === "percent" && f.discountValue > 100 ? "Máximo é 100%." : undefined}
            >
              {(props) => (
                <Input
                  {...props}
                  inputMode="decimal"
                  value={f.discountType === "percent" ? String(f.discountValue) : reais(f.discountValue)}
                  onChange={(e) => setField("discountValue", f.discountType === "percent" ? Math.max(0, Math.min(100, Number(e.target.value) || 0)) : centsFrom(e.target.value))}
                />
              )}
            </Field>
            <Field label="Ordem na vitrine">
              {(props) => <Input {...props} type="number" min={0} max={9999} value={f.sortOrder} onChange={(e) => setField("sortOrder", Number(e.target.value) || 0)} />}
            </Field>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Início da promoção" optional>
            {(props) => <Input {...props} type="datetime-local" value={f.promoStartsAt ?? ""} onChange={(e) => setField("promoStartsAt", e.target.value || null)} />}
          </Field>
          <Field label="Fim da promoção" optional>
            {(props) => <Input {...props} type="datetime-local" value={f.promoEndsAt ?? ""} onChange={(e) => setField("promoEndsAt", e.target.value || null)} />}
          </Field>
        </div>
      </section>

      {/* Entrega */}
      <section className="space-y-5">
        <h2 className="text-[1.5rem] text-ink">Entrega e catálogo</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Tipo de produto">
            {(props) => (
              <Select {...props} value={f.productType} onChange={(e) => setField("productType", e.target.value as ProductDraft["productType"])}>
                <option value="digital">Digital (entrega imediata)</option>
                <option value="physical">Físico</option>
                <option value="mixed">Misto</option>
              </Select>
            )}
          </Field>
          <Field label="Prazo de entrega (dias)" hint="0 = entrega imediata (digital)">
            {(props) => <Input {...props} type="number" min={0} max={365} value={f.deliveryDays} onChange={(e) => setField("deliveryDays", Number(e.target.value) || 0)} />}
          </Field>
          <Field label="Rótulo de prazo" optional>
            {(props) => <Input {...props} value={f.deliveryLabel ?? ""} onChange={(e) => setField("deliveryLabel", e.target.value || null)} placeholder="Entrega imediata" />}
          </Field>
          <Field label="SKU" optional>
            {(props) => <Input {...props} value={f.sku ?? ""} onChange={(e) => setField("sku", e.target.value || null)} />}
          </Field>
          <Field label="Estoque (físico)" optional>
            {(props) => <Input {...props} type="number" min={0} value={f.stockQuantity ?? ""} onChange={(e) => setField("stockQuantity", e.target.value === "" ? null : (Number(e.target.value) || 0))} />}
          </Field>
          <Field label="Limite de downloads" optional hint="Vazio = ilimitado">
            {(props) => <Input {...props} type="number" min={1} value={f.downloadLimit ?? ""} onChange={(e) => setField("downloadLimit", e.target.value === "" ? null : (Number(e.target.value) || 1))} />}
          </Field>
        </div>
      </section>

      {/* Conteúdo vendido */}
      <section className="space-y-5">
        <h2 className="text-[1.5rem] text-ink">Benefícios e o que está incluído</h2>
        <Field label="Benefícios" hint="Um por linha. Exibidos com ✓ na página do produto.">
          {(props) => <Textarea {...props} value={f.benefits.join("\n")} onChange={(e) => setField("benefits", e.target.value.split("\n"))} className="min-h-28" />}
        </Field>
        <Field label="O que está incluído" hint="Um por linha (arquivos e recursos que acompanham o produto).">
          {(props) => <Textarea {...props} value={f.includes.join("\n")} onChange={(e) => setField("includes", e.target.value.split("\n"))} className="min-h-28" />}
        </Field>
        {f.isFeatured && <p className="text-xs text-muted">Este produto também pode aparecer como destaque na página inicial.</p>}
      </section>

      {/* Destaques */}
      <fieldset className="space-y-3">
        <legend className="font-display font-bold text-xl text-ink">Exibição</legend>
        <ul className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["isActive", "Produto publicado", "Fica visível na loja e na busca."],
              ["isFeatured", "Em destaque", "Fica na seção de destaque da página inicial."],
              ["isNew", "Selo NOVO", "Mostra o selo NOVO nos cards."],
              ["isBestSeller", "Selo MAIS VENDIDO", "Mostra o selo MAIS VENDIDO nos cards."],
            ] as const
          ).map(([key, label, hint]) => (
            <li key={key} className="rounded-[var(--radius-sm)] border border-line bg-sheet p-4">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={Boolean(f[key])} onChange={(e) => setField(key, e.target.checked)} className="mt-0.5 size-4 accent-pine" />
                <span>
                  <span className="font-medium text-ink">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {f.productType !== "digital" && !f.isActive && (
          <p className="text-xs text-muted">Produtos físicos exigem estoque e logística; publique apenas quando estiver pronto para vender.</p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <Button type="submit" loading={saving}>
          {product.id ? "Salvar alterações" : "Criar produto"}
        </Button>
        <Link href="/admin/produtos" className="text-sm text-muted hover:text-pine">Cancelar</Link>
      </div>
    </form>
  );
}

const PREVIEW_STATUS: Record<NonNullable<AdminProductFile["previewStatus"]>, { label: string; tone: string }> = {
  completed: { label: "Prévia do conteúdo", tone: "text-pine" },
  fallback: { label: "Capa de marca", tone: "text-amber" },
  failed: { label: "Falha ao gerar", tone: "text-danger" },
  pending: { label: "Processando…", tone: "text-muted" },
};

function PreviewThumb({ file, className }: { file: AdminProductFile; className?: string }) {
  if (!file.previewUrl) {
    return (
      <div className={cn("grid place-items-center rounded-[var(--radius-sm)] border border-line bg-green-50 text-xs text-muted", className)}>
        Sem prévia
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={file.previewUrl} alt="" className={cn("rounded-[var(--radius-sm)] border border-line bg-sheet object-cover", className)} />;
}

export function ProductFiles({
  productId,
  files,
  slug,
  coverUrl,
  coverSourceFileId,
}: {
  productId: string;
  files: AdminProductFile[];
  slug: string;
  coverUrl: string | null;
  coverSourceFileId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [dragging, setDragging] = useState(false);
  const [editingLabel, setEditingLabel] = useState<{ id: string; value: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadQueue();

  const coverSource = files.find((f) => f.id === coverSourceFileId) ?? null;
  const coverStatus = coverSource?.previewStatus ?? null;
  const alert = message ?? upload.message;

  async function run(key: string, fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setBusy(key);
    setMessage(null);
    const res = await fn();
    setBusy(null);
    if (!res.ok) setMessage(res.error);
    else router.refresh();
  }

  async function removeFile(f: AdminProductFile): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!confirm(`Remover "${f.original_name}"?`)) return { ok: true };
    const first = await removeProductFileAction({ fileId: f.id, productId, slug });
    if (first.ok) return { ok: true };
    if (first.soldOrders && confirm(`${first.error}\n\nRemover mesmo assim? Isso pode afetar compras existentes.`)) {
      const forced = await removeProductFileAction({ fileId: f.id, productId, slug, force: true });
      return forced.ok ? { ok: true } : { ok: false, error: forced.error };
    }
    return { ok: false, error: first.error };
  }

  return (
    <section className="space-y-6">
      <h2 className="text-[1.5rem] text-ink">Arquivos de entrega</h2>
      {alert && <p className="text-sm font-medium text-danger" role="alert">{alert}</p>}

      {/* Capa */}
      <div className="rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
        <div className="grid gap-5 sm:grid-cols-[200px_1fr] sm:items-center">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={`Capa de ${slug}`} className="aspect-[4/3] w-full max-w-[200px] rounded-[var(--radius-sm)] border border-line object-cover" />
          ) : (
            <div className="grid aspect-[4/3] w-full max-w-[200px] place-items-center rounded-[var(--radius-sm)] border border-dashed border-line-strong text-xs text-muted">
              Sem capa
            </div>
          )}
          <div className="space-y-2">
            <p className="font-medium text-ink">Capa do produto</p>
            <p className="text-sm text-muted">
              {coverUrl
                ? coverSource
                  ? `Gerada a partir de "${coverSource.original_name}".`
                  : "Definida manualmente."
                : "Enviamos um arquivo e geramos a capa automaticamente."}
            </p>
            {coverStatus && <p className={cn("text-xs font-medium", PREVIEW_STATUS[coverStatus].tone)}>{PREVIEW_STATUS[coverStatus].label}</p>}
            <p className="text-xs text-muted">A capa aparece na loja, nos cards e na página do produto. Uploads novos não trocam a capa sozinhos.</p>
          </div>
        </div>
      </div>

      {/* Arquivos */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => {
            const isCover = f.id === coverSourceFileId;
            const status = f.previewStatus ? PREVIEW_STATUS[f.previewStatus] : null;
            return (
              <li key={f.id} className="flex flex-wrap items-center gap-4 rounded-[var(--radius-sm)] border border-line bg-sheet px-4 py-3 text-sm">
                <PreviewThumb file={f} className="aspect-[4/3] w-20 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{f.original_name}</p>
                  {editingLabel?.id === f.id ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Input
                        value={editingLabel.value}
                        onChange={(e) => setEditingLabel({ id: f.id, value: e.target.value })}
                        placeholder="Rótulo exibido"
                        className="h-9 max-w-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        loading={busy === `label-${f.id}`}
                        onClick={() =>
                          run(`label-${f.id}`, async () => {
                            const res = await updateProductFileLabelAction({ fileId: f.id, label: editingLabel.value });
                            if (res.ok) setEditingLabel(null);
                            return res;
                          })
                        }
                      >
                        Salvar
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingLabel(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      {f.label && <>Rótulo: {f.label} · </>}
                      {f.mimeType.split("/")[1]} · {f.size_bytes ? formatBytes(f.size_bytes) : "—"}
                      {status && <> · <span className={status.tone}>{status.label}</span></>}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    loading={busy === `view-${f.id}`}
                    onClick={() =>
                      run(`view-${f.id}`, async () => {
                        const res = await createProductFileUrlAction({ fileId: f.id });
                        if (res.ok) window.open(res.data.url, "_blank", "noopener,noreferrer");
                        return res;
                      })
                    }
                  >
                    Visualizar
                  </Button>
                  {editingLabel?.id !== f.id && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingLabel({ id: f.id, value: f.label })}>
                      Editar rótulo
                    </Button>
                  )}
                  {isCover ? (
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-pine">Capa atual</span>
                  ) : (
                    <Button type="button" variant="outline" size="sm" loading={busy === `cover-${f.id}`} onClick={() => run(`cover-${f.id}`, () => setProductCoverAction({ productId, fileId: f.id }))}>
                      Usar como capa
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" loading={busy === `regen-${f.id}`} onClick={() => run(`regen-${f.id}`, () => regenerateProductPreviewAction({ productId, fileId: f.id }))}>
                    Regenerar
                  </Button>
                  <Button type="button" variant="danger" size="sm" loading={busy === `del-${f.id}`} onClick={() => run(`del-${f.id}`, () => removeFile(f))}>
                    Remover
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer?.files) upload.addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1 rounded-[var(--radius-sm)] border border-dashed px-4 py-6 text-center transition-colors",
            dragging ? "border-pine bg-green-50" : "border-line-strong hover:border-pine",
          )}
        >
          <p className="text-sm font-medium text-ink">Arraste arquivos aqui ou clique para selecionar</p>
          <p className="text-xs text-muted">
            Qualquer formato (documentos, planilhas, apresentações, ZIP, EPUB, imagens, áudio, vídeo…) — máx. {MAX_PRODUCT_FILE_SIZE_MB} MB por arquivo.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) upload.addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {upload.items.length > 0 && (
          <div className="space-y-3 rounded-[var(--radius-sm)] border border-line bg-sheet p-4">
            <ul className="space-y-2">
              {upload.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 text-sm">
                  <FileTypeIcon extension={extensionOf(it.file.name)} className="size-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ink">{it.file.name}</p>
                    {it.status === "uploading" && (
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-green-50">
                        <div className="h-full bg-pine transition-[width]" style={{ width: `${it.progress}%` }} />
                      </div>
                    )}
                    {it.status === "error" && <p className="text-xs text-danger">{it.error}</p>}
                    {it.status === "done" && <p className="text-xs text-pine">Enviado. Prévia sendo gerada.</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted">{formatBytes(it.file.size)}</span>
                  {it.status !== "uploading" && it.status !== "done" && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => upload.removeItem(it.id)}>
                      Remover
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Rótulo" optional hint="Aplicado aos arquivos desta leva." className="flex-1">
                {(props) => <Input {...props} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Guia completo em PDF" />}
              </Field>
              <Button type="button" loading={upload.uploading} onClick={() => upload.sendAll(productId, label)}>
                Enviar {upload.pendingCount || ""}
              </Button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted">
        Os arquivos ficam num espaço privado e só o cliente que pagou consegue baixar, pelo link assinado. A prévia e a capa são geradas automaticamente.
      </p>
    </section>
  );
}