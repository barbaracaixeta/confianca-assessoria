import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  createStudioOrder,
  getStudioSnapshot,
  resetStudio,
  setStudioFeedback,
  simulateStudioPayment,
} from "@/lib/demo/order-studio";
import type { PaymentStatus } from "@/types/domain";

export const dynamic = "force-dynamic";

/**
 * 🔬 HTTP do "Order Studio" (somente em modo demonstração).
 *
 * Permite exercitar o fluxo de pedido → pagamento → auto-liberação com curl/scripts
 * no localhost, sem depender do protocolo de Server Actions. `GET` devolve o
 * snapshot do studio (inclusive os e-mails enfileirados pelo after()). Em
 * produção (Supabase configurado) responde 404.
 */
export async function GET() {
  if (isSupabaseConfigured) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, snapshot: getStudioSnapshot() });
}

export async function POST(request: Request) {
  if (isSupabaseConfigured) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    providerPaymentId?: string;
    next?: string;
  } | null;
  const action = body?.action;

  try {
    if (action === "order") {
      const { orderId, providerPaymentId } = await createStudioOrder();
      setStudioFeedback(`Pedido ${orderId} criado (pagamento ${providerPaymentId}).`);
    } else if (action === "payment") {
      const allowed: PaymentStatus[] = ["confirmed", "received", "refused", "refunded", "overdue", "cancelled"];
      const next = body?.next as PaymentStatus;
      if (!body?.providerPaymentId || !allowed.includes(next)) {
        return NextResponse.json({ ok: false, error: "providerPaymentId e next são obrigatórios." }, { status: 400 });
      }
      const res = await simulateStudioPayment(body.providerPaymentId, next);
      setStudioFeedback(res.error ? res.error : res.changed ? `Webhook simulado: pagamento ${next} aplicado.` : "Transição ignorada (inválida ou sem efeito).");
      if (res.error) return NextResponse.json({ ok: false, error: res.error }, { status: 422 });
    } else if (action === "reset") {
      resetStudio();
      setStudioFeedback("Studio reiniciado.");
    } else {
      return NextResponse.json({ ok: false, error: "action inválida (order | payment | reset)." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, snapshot: getStudioSnapshot() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}