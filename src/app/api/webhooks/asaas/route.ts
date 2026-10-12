import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/env.server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ASAAS_EVENT_STATUS } from "@/lib/asaas/status";
import { applyPaymentStatus } from "@/lib/payments/apply-status";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  payment: z
    .object({
      id: z.string().min(1),
      paymentDate: z.string().nullish(),
      confirmedDate: z.string().nullish(),
    })
    .passthrough()
    .optional(),
});

function tokenMatches(received: string | null): boolean {
  const expected = serverEnv.ASAAS_WEBHOOK_TOKEN;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/webhooks/asaas
 * 1. Autentica pelo header asaas-access-token (token configurado no painel do Asaas).
 * 2. Persiste o evento — o id único garante idempotência (entrega "pelo menos uma vez").
 * 3. Aplica a transição de status e responde 200.
 */
export async function POST(request: NextRequest) {
  if (!tokenMatches(request.headers.get("asaas-access-token"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "backend não configurado" }, { status: 503 });

  const raw = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  const evt = parsed.data;

  const { error: insertError } = await admin.from("payment_events").insert({
    provider: "asaas",
    provider_event_id: evt.id,
    event: evt.event,
    provider_payment_id: evt.payment?.id ?? null,
    payload: raw,
  });

  if (insertError) {
    // 23505 = já recebido: confirma sem reprocessar
    if (insertError.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    console.error("[asaas-webhook] falha ao registrar evento", insertError);
    return NextResponse.json({ error: "falha ao registrar" }, { status: 500 });
  }

  const status = ASAAS_EVENT_STATUS[evt.event];
  try {
    if (status && evt.payment) {
      await applyPaymentStatus(admin, evt.payment.id, status, {
        paidAt: evt.payment.confirmedDate ?? evt.payment.paymentDate ?? null,
        failureReason: status === "refused" ? evt.event : null,
      });
    }
    await admin.from("payment_events").update({ processed_at: new Date().toISOString() }).eq("provider_event_id", evt.id);
  } catch (e) {
    console.error("[asaas-webhook] falha ao processar", e);
    await admin.from("payment_events").update({ error: String(e).slice(0, 500) }).eq("provider_event_id", evt.id);
  }

  return NextResponse.json({ received: true });
}
