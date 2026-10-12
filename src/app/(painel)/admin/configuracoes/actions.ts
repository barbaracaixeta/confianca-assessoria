"use server";

import { revalidatePath } from "next/cache";
import { authorizePermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  checkoutSchema,
  companySchema,
  type CheckoutSettings,
  type CompanySettings,
} from "@/lib/admin/settings-admin";

type Result = { ok: true; data: undefined } | { ok: false; error: string };

export async function saveCompanySettingsAction(input: CompanySettings): Promise<Result> {
  const auth = await authorizePermission("settings.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { error } = await admin
    .from("site_settings")
    .upsert({ key: "public.company", value: parsed.data, updated_by: auth.user.id }, { onConflict: "key" });
  if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/admin/configuracoes");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function saveCheckoutSettingsAction(input: CheckoutSettings): Promise<Result> {
  const auth = await authorizePermission("settings.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { error } = await admin
    .from("site_settings")
    .upsert({ key: "public.checkout", value: parsed.data, updated_by: auth.user.id }, { onConflict: "key" });
  if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/admin/configuracoes");
  revalidatePath("/checkout");
  return { ok: true, data: undefined };
}
