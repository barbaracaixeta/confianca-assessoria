"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { appUrl } from "@/lib/env";

export interface AuthState {
  error?: string;
  message?: string;
  fields?: Record<string, string>;
}

/** Aceita apenas caminhos internos como destino pós-login (evita open redirect). */
function safeNext(value: FormDataEntryValue | null, fallback = "/minha-conta"): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

const NOT_CONFIGURED = "Login indisponível neste ambiente: configure o Supabase (veja o README).";

export async function signInAction(_: AuthState, form: FormData): Promise<AuthState> {
  const limited = await rateLimit("login", 10, 10 * 60_000);
  if (!limited.ok) return { error: "Muitas tentativas. Aguarde alguns minutos." };

  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Informe e-mail e senha.", fields: { email: String(form.get("email") ?? "") } };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error: error.message.includes("Email not confirmed") ? "Confirme seu e-mail pelo link que enviamos antes de entrar." : "E-mail ou senha incorretos.",
      fields: { email: parsed.data.email },
    };
  }
  redirect(safeNext(form.get("next")));
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo.").max(120),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .regex(/[A-Za-z]/, "Use letras e números na senha.")
    .regex(/\d/, "Use letras e números na senha."),
});

export async function signUpAction(_: AuthState, form: FormData): Promise<AuthState> {
  const limited = await rateLimit("signup", 5, 10 * 60_000);
  if (!limited.ok) return { error: "Muitas tentativas. Aguarde alguns minutos." };

  const raw = { fullName: form.get("fullName"), email: form.get("email"), password: form.get("password") };
  const parsed = signUpSchema.safeParse(raw);
  const fields = { fullName: String(raw.fullName ?? ""), email: String(raw.email ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED, fields };

  const next = safeNext(form.get("next"));
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${appUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: "Não foi possível criar a conta. Verifique os dados e tente novamente.", fields };

  if (data.session) redirect(next);
  return { message: `Enviamos um link de confirmação para ${parsed.data.email}. Abra o e-mail para ativar sua conta.` };
}

export async function requestPasswordResetAction(_: AuthState, form: FormData): Promise<AuthState> {
  const limited = await rateLimit("reset", 5, 10 * 60_000);
  if (!limited.ok) return { error: "Muitas tentativas. Aguarde alguns minutos." };

  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { error: "Informe um e-mail válido." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };

  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${appUrl}/auth/confirm?next=/redefinir-senha` });
  // Mesma resposta exista ou não a conta (não revela e-mails cadastrados).
  return { message: "Se houver uma conta com este e-mail, você receberá um link para criar uma nova senha." };
}

export async function updatePasswordAction(_: AuthState, form: FormData): Promise<AuthState> {
  const password = signUpSchema.shape.password.safeParse(form.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "O link expirou. Solicite uma nova redefinição de senha." };
  redirect("/minha-conta");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}
