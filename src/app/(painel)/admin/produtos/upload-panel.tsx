"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FileTypeIcon } from "@/components/files/file-type-icon";
import { cn, formatBytes } from "@/lib/utils";
import { MAX_PRODUCT_FILE_SIZE_MB, extensionOf } from "@/lib/admin/product-files";
import { useUploadQueue } from "./use-upload-queue";
import { createProductQuickAction } from "./actions";

export interface UploadProductOption {
  id: string;
  name: string;
  isActive: boolean;
}

function parsePriceToCents(raw: string): number {
  const t = raw.trim();
  if (!t) return 0;
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/**
 * Envio de arquivos de entrega direto da lista de Produtos. Você digita o nome
 * de um produto novo (é assim que ele aparece na loja e na home) ou escolhe um
 * existente, arrasta arquivos de qualquer formato e o produto é publicado.
 */
export function UploadPanel({ products }: { products: UploadProductOption[] }) {
  const [created, setCreated] = useState<UploadProductOption[]>([]);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [label, setLabel] = useState("");
  const [dragging, setDragging] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadQueue();

  const options = [...products, ...created.filter((c) => !products.some((p) => p.id === c.id))];
  const alert = upload.message;
  const selected = options.find((p) => p.id === productId) ?? null;
  const busy = creating || upload.uploading;

  async function handleSend() {
    if (upload.items.length === 0) {
      upload.setMessage("Selecione ao menos um arquivo.");
      return;
    }

    let target = productId;
    if (mode === "new") {
      if (newName.trim().length < 2) {
        upload.setMessage("Informe o nome do produto.");
        return;
      }
      setCreating(true);
      const created = await createProductQuickAction({ name: newName, priceCents: parsePriceToCents(newPrice) });
      setCreating(false);
      if (!created.ok) {
        upload.setMessage(created.error);
        return;
      }
      const id = created.data.id;
      setCreated((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, { id, name: newName.trim(), isActive: true }]));
      setProductId(id);
      setMode("existing");
      setNewName("");
      setNewPrice("");
      target = id;
    }

    await upload.sendAll(target, label, { publish: true });
  }

  return (
    <section className="mt-8 rounded-[var(--radius)] border border-line bg-sheet p-5">
      <h2 className="font-serif text-xl text-ink">Enviar arquivos</h2>
      <p className="mt-1 text-sm text-muted">
        Qualquer formato de extensão (documentos, planilhas, apresentações, ZIP, EPUB, imagens, áudio, vídeo…), até {MAX_PRODUCT_FILE_SIZE_MB} MB por arquivo. Ao enviar, o produto é publicado na loja automaticamente.
      </p>

      {alert && <p className="mt-3 text-sm font-medium text-danger" role="alert">{alert}</p>}

      <div className="mt-4 inline-flex rounded-[var(--radius-sm)] border border-line p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setMode("new")}
          aria-pressed={mode === "new"}
          className={cn("rounded-[var(--radius-xs)] px-3 py-1.5 font-medium transition-colors", mode === "new" ? "bg-pine text-paper" : "text-ink-2 hover:text-pine")}
        >
          Novo produto
        </button>
        <button
          type="button"
          onClick={() => setMode("existing")}
          aria-pressed={mode === "existing"}
          className={cn("rounded-[var(--radius-xs)] px-3 py-1.5 font-medium transition-colors", mode === "existing" ? "bg-pine text-paper" : "text-ink-2 hover:text-pine")}
        >
          Produto existente
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {mode === "new" ? (
          <>
            <Field label="Nome do produto" hint="É o título que aparece na loja e na home.">
              {(props) => (
                <Input
                  {...props}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex.: Modelo de TCC em ABNT"
                />
              )}
            </Field>
            <Field label="Preço" optional hint="Em reais. Pode ajustar depois no produto.">
              {(props) => (
                <Input
                  {...props}
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ex.: 49,90"
                />
              )}
            </Field>
          </>
        ) : (
          <>
            <Field label="Produto" hint="O arquivo será vinculado a este produto.">
              {(props) => (
                <Select {...props} value={productId} onChange={(e) => setProductId(e.target.value)}>
                  {options.length === 0 && <option value="">Nenhum produto ainda</option>}
                  {options.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.isActive ? "" : " (rascunho)"}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Rótulo" optional hint="Aplicado aos arquivos desta leva.">
              {(props) => <Input {...props} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Guia completo em PDF" />}
            </Field>
          </>
        )}
      </div>

      {mode === "new" && (
        <div className="mt-3">
          <Field label="Rótulo" optional hint="Aplicado aos arquivos desta leva.">
            {(props) => <Input {...props} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Guia completo em PDF" />}
          </Field>
        </div>
      )}

      {mode === "existing" && selected && !selected.isActive && (
        <p className="mt-3 text-xs text-muted">Este produto está como rascunho. Ao enviar, ele é publicado na loja automaticamente.</p>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
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
          "mt-4 flex cursor-pointer flex-col items-center gap-1 rounded-[var(--radius-sm)] border border-dashed px-4 py-6 text-center transition-colors",
          dragging ? "border-pine bg-green-50" : "border-line-strong hover:border-pine",
        )}
      >
        <p className="text-sm font-medium text-ink">Arraste arquivos aqui ou clique para selecionar</p>
        <p className="text-xs text-muted">Você pode enviar vários de uma vez.</p>
        <input
          ref={inputRef}
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
        <div className="mt-4 space-y-3 rounded-[var(--radius-sm)] border border-line bg-paper p-4">
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
          <Button type="button" loading={busy} onClick={handleSend}>
            {mode === "new" ? "Criar e enviar" : "Enviar"} {upload.pendingCount || ""}
          </Button>
        </div>
      )}
    </section>
  );
}
