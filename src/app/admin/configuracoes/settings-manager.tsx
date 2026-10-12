"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { saveCompanySettingsAction, saveCheckoutSettingsAction } from "./actions";
import type { CheckoutSettings, CompanySettings } from "@/lib/admin/settings-admin";

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function SettingsManager({ company, checkout }: { company: CompanySettings; checkout: CheckoutSettings }) {
  const router = useRouter();
  const [c, setC] = useState<CompanySettings>(company);
  const [k, setK] = useState<CheckoutSettings>(checkout);
  const [busyCompany, setBusyCompany] = useState(false);
  const [busyCheckout, setBusyCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, label: string) {
    setError(null);
    setSaved(null);
    const res = await fn();
    if (!res.ok) return setError(res.error ?? "Erro ao salvar.");
    setSaved(label);
    router.refresh();
  }

  async function saveCompany() {
    setBusyCompany(true);
    await run(() => saveCompanySettingsAction(c), "Dados institucionais salvos.");
    setBusyCompany(false);
  }

  async function saveCheckout() {
    setBusyCheckout(true);
    await run(() => saveCheckoutSettingsAction(k), "Preferências de checkout salvas.");
    setBusyCheckout(false);
  }

  return (
    <div className="mt-8 max-w-[880px] space-y-6">
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
      {saved && <Alert tone="green" role="status">{saved}</Alert>}

      <section className="space-y-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
        <div>
          <h2 className="font-medium text-ink">Dados institucionais</h2>
          <p className="mt-0.5 text-xs text-muted">Aparecem no rodapé, nas páginas de contato e nos documentos. Campos vazios não são exibidos.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            {(props) => <Input {...props} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />}
          </Field>
          <Field label="E-mail" optional>
            {(props) => <Input {...props} type="email" value={c.email ?? ""} onChange={(e) => setC({ ...c, email: nullable(e.target.value) })} />}
          </Field>
          <Field label="Telefone" optional>
            {(props) => <Input {...props} value={c.phone ?? ""} onChange={(e) => setC({ ...c, phone: nullable(e.target.value) })} />}
          </Field>
          <Field label="WhatsApp" optional>
            {(props) => <Input {...props} value={c.whatsapp ?? ""} onChange={(e) => setC({ ...c, whatsapp: nullable(e.target.value) })} />}
          </Field>
          <Field label="CNPJ" optional>
            {(props) => <Input {...props} value={c.cnpj ?? ""} onChange={(e) => setC({ ...c, cnpj: nullable(e.target.value) })} />}
          </Field>
          <Field label="Endereço" optional className="sm:col-span-2">
            {(props) => <Textarea {...props} value={c.address ?? ""} onChange={(e) => setC({ ...c, address: nullable(e.target.value) })} className="min-h-16" />}
          </Field>
          <Field label="Instagram (URL)" optional>
            {(props) => <Input {...props} type="url" value={c.instagram ?? ""} onChange={(e) => setC({ ...c, instagram: nullable(e.target.value) })} placeholder="https://instagram.com/..." />}
          </Field>
          <Field label="LinkedIn (URL)" optional>
            {(props) => <Input {...props} type="url" value={c.linkedin ?? ""} onChange={(e) => setC({ ...c, linkedin: nullable(e.target.value) })} placeholder="https://linkedin.com/company/..." />}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={saveCompany} loading={busyCompany} disabled={!c.name.trim()}>Salvar dados</Button>
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-5">
        <div>
          <h2 className="font-medium text-ink">Checkout</h2>
          <p className="mt-0.5 text-xs text-muted">Regras aplicadas na hora do pagamento por Pix ou cartão.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Máximo de parcelas" hint="Entre 1 e 12.">
            {(props) => (
              <Input {...props} type="number" min={1} max={12} value={k.maxInstallments} onChange={(e) => setK({ ...k, maxInstallments: Number(e.target.value) || 0 })} />
            )}
          </Field>
          <Field label="Parcela mínima (R$)" hint="Valor mínimo de cada parcela.">
            {(props) => (
              <Input
                {...props}
                inputMode="decimal"
                value={(k.minInstallmentCents / 100).toFixed(2).replace(".", ",")}
                onChange={(e) => setK({ ...k, minInstallmentCents: Math.round(Number(e.target.value.replace(/\./g, "").replace(",", ".")) * 100) || 0 })}
              />
            )}
          </Field>
          <Field label="Expiração do Pix (horas)" hint="Entre 1 e 168 horas.">
            {(props) => (
              <Input {...props} type="number" min={1} max={168} value={k.pixExpiresInHours} onChange={(e) => setK({ ...k, pixExpiresInHours: Number(e.target.value) || 0 })} />
            )}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={saveCheckout} loading={busyCheckout}>Salvar checkout</Button>
        </div>
      </section>
    </div>
  );
}
