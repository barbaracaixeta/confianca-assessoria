"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { passwordIssues } from "@/lib/security/password";

export interface ChangePasswordState {
  error?: string;
}

const NOT_CONFIGURED = "Este ambiente não está conectado ao banco de dados.";

/**
 * Troca a senha do próprio usuário autenticado (primeiro acesso ou por
 * vontade). Credenciais ficam no Supabase Auth; só limpamos a marca de
 * "trocar senha" no perfil, via service role no servidor.
 */
export async function changeAdminPasswordAction(_: ChangePasswordState, form: FormData): Promise<ChangePasswordState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente." };

  const parsed = z
    .object({ password: z.string().min(1), confirm: z.string().min(1) })
    .safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { error: "Preencha os dois campos de senha." };

  const issues = passwordIssues(parsed.data.password);
  if (issues.length > 0) return { error: "A senha não atende aos requisitos de segurança." };
  if (parsed.data.password !== parsed.data.confirm) return { error: "As senhas não coincidem." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Não foi possível alterar a senha. Tente novamente." };

  const admin = createSupabaseAdminClient();
  if (admin) {
    await admin.from("profiles").update({ must_change_password: false }).eq("id", user.id);
  }

  revalidatePath("/admin");
  redirect("/admin");
}