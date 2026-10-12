import { NextResponse, type NextRequest } from "next/server";
import { getOrderForViewer } from "@/lib/orders/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { asaas, isAsaasConfigured } from "@/lib/asaas/client";
import { mapAsaasStatus } from "@/lib/asaas/status";
import { applyPaymentStatus } from "@/lib/payments/apply-status";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Consulta de status para a tela de pagamento. Lê o banco (atualizado pelo webhook);
 * se ainda pendente, confere direto no Asaas pelo servidor como reforço — o navegador
 * nunca informa que o pagamento foi feito.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/pedidos/[id]/status">) {
  const { id } = await ctx.params;
  const limited = await rateLimit("order-status", 40, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const token = request.nextUrl.searchParams.get("t");
  let order = await getOrderForViewer(id, token);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const verify = request.nextUrl.searchParams.get("verify") === "1";
  if (verify && order.payment?.providerPaymentId && order.paymentStatus === "pending" && isAsaasConfigured()) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      try {
        const remote = await asaas.getPayment(order.payment.providerPaymentId);
        const status = mapAsaasStatus(remote.status);
        if (status !== "pending") {
          await applyPaymentStatus(admin, remote.id, status, { paidAt: remote.confirmedDate ?? remote.paymentDate ?? null });
          order = (await getOrderForViewer(id, token)) ?? order;
        }
      } catch (e) {
        console.error("[order-status] verificação no Asaas falhou", e);
      }
    }
  }

  return NextResponse.json(
    { status: order.status, paymentStatus: order.paymentStatus },
    { headers: { "Cache-Control": "no-store" } },
  );
}
