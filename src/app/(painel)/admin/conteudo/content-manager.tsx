"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { saveHomeContentAction } from "./actions";
import type { HomeContent } from "@/lib/admin/settings-admin";

export function ContentManager({ initial }: { initial: HomeContent }) {
  const router = useRouter();
  const [d, setD] = useState<HomeContent>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fn();
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Erro ao salvar.");
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="mt-8 max-w-[880px] space-y-6">
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
      {saved && <Alert tone="green" role="status">Conteúdo da página inicial salvo.</Alert>}

      <section className="space-y-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
        <div>
          <h2 className="font-medium text-ink">Destaque da página inicial</h2>
          <p className="mt-0.5 text-xs text-muted">Texto e botão exibidos no topo da loja. O destino precisa ser um caminho interno, como /loja.</p>
        </div>
        <Field label="Título">
          {(props) => <Input {...props} value={d.heroTitle} onChange={(e) => setD({ ...d, heroTitle: e.target.value })} />}
        </Field>
        <Field label="Subtítulo" optional>
          {(props) => <Textarea {...props} value={d.heroSubtitle} onChange={(e) => setD({ ...d, heroSubtitle: e.target.value })} className="min-h-20" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Texto do botão" optional>
            {(props) => <Input {...props} value={d.heroCtaLabel} onChange={(e) => setD({ ...d, heroCtaLabel: e.target.value })} placeholder="Explorar produtos" />}
          </Field>
          <Field label="Destino do botão" optional>
            {(props) => <Input {...props} value={d.heroCtaHref} onChange={(e) => setD({ ...d, heroCtaHref: e.target.value })} placeholder="/loja" />}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => void run(() => saveHomeContentAction(d))}
            loading={busy}
          >
            Salvar conteúdo
          </Button>
        </div>
      </section>
    </div>
  );
}
