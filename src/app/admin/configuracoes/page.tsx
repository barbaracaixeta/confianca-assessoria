import type { Metadata } from "next";
import { requireAdminArea } from "@/lib/admin/access";
import { getAdminCheckoutSettings, getAdminCompanySettings } from "@/lib/admin/settings-admin";
import { SettingsManager } from "./settings-manager";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdminArea("admin");
  const [company, checkout] = await Promise.all([getAdminCompanySettings(), getAdminCheckoutSettings()]);
  return (
    <div>
      <h1 className="display text-[2.25rem] text-pine">Configurações</h1>
      <p className="mt-1 text-sm text-muted">
        Dados institucionais e regras de pagamento da loja. O que for salvo aqui passa a valer imediatamente para clientes e checkout.
      </p>
      <SettingsManager company={company} checkout={checkout} />
    </div>
  );
}
