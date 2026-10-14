import type { Metadata } from "next";
import { CheckoutForm, type CheckoutDefaults } from "./checkout-form";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCheckoutSettings } from "@/lib/settings";

// Depende da sessão: sempre renderizado por requisição.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pagamento", robots: { index: false } };

export default async function CheckoutPage() {
  const [user, settings] = await Promise.all([getCurrentUser(), getCheckoutSettings()]);

  const defaults: CheckoutDefaults = { fullName: "", email: "", phone: "", cpfCnpj: "" };
  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data } = (await supabase?.from("profiles").select("full_name, email, phone, cpf_cnpj").eq("id", user.id).maybeSingle()) ?? {};
    defaults.fullName = data?.full_name ?? "";
    defaults.email = data?.email ?? user.email;
    defaults.phone = data?.phone ?? "";
    defaults.cpfCnpj = data?.cpf_cnpj ?? "";
  }

  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-12 pb-24 md:px-8">
      <p className="eyebrow text-green">Finalizar compra</p>
      <h1 className="display mt-3 text-[2.75rem] text-pine md:text-[3.5rem]">Pagamento</h1>
      <p className="mt-3 mb-10 text-muted">
        {user ? `Comprando como ${user.email}.` : "Não precisa criar conta agora: você acompanha o pedido pelo link enviado por e-mail."}
      </p>
      <CheckoutForm defaults={defaults} maxInstallments={settings.maxInstallments} minInstallmentCents={settings.minInstallmentCents} />
    </div>
  );
}
