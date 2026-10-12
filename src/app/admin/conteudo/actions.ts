"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { homeContentSchema, type HomeContent } from "@/lib/admin/settings-admin";

type Result = { ok: true; data: undefined } | { ok: false; error: string };

export async function saveHomeContentAction(input: HomeContent): Promise<Result> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = homeContentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { error } = await admin
    .from("site_settings")
    .upsert({ key: "public.home", value: parsed.data, updated_by: auth.user.id }, { onConflict: "key" });
  if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/admin/conteudo");
  revalidatePath("/");
  return { ok: true, data: undefined };
}
