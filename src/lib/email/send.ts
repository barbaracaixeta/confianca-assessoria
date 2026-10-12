import "server-only";
import { serverEnv } from "@/lib/env.server";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { renderEmail, type EmailTemplate } from "./templates";

/**
 * Registra a notificação e tenta enviá-la pelo Resend. Sem RESEND_API_KEY a
 * notificação fica com status "skipped" — visível no painel, nunca perdida em silêncio.
 * Recuperação de senha é enviada pelo próprio Supabase Auth (configure o SMTP do Resend lá).
 */
export async function sendEmail(admin: AdminSupabase, to: string, template: EmailTemplate, profileId?: string | null) {
  const { subject, html } = renderEmail(template);
  const { data: row } = await admin
    .from("notifications")
    .insert({ profile_id: profileId ?? null, template: template.name, recipient: to, payload: template.data })
    .select("id")
    .single();

  if (!serverEnv.RESEND_API_KEY) {
    if (row) await admin.from("notifications").update({ status: "skipped", error: "RESEND_API_KEY ausente" }).eq("id", row.id);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${serverEnv.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: serverEnv.EMAIL_FROM, to, subject, html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    if (row) await admin.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", row.id);
  } catch (e) {
    if (row) await admin.from("notifications").update({ status: "failed", error: String(e).slice(0, 500) }).eq("id", row.id);
  }
}
