"use server";

import { checkoutSchema } from "@/lib/validation/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAsaasConfigured } from "@/lib/asaas/client";
import { getCurrentUser } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { createOrder, type CreateOrderResult } from "@/lib/orders/create-order";

export async function placeOrderAction(input: unknown): Promise<CreateOrderResult> {
  const limited = await rateLimit("checkout", 6, 10 * 60_000);
  if (!limited.ok) return { ok: false, error: "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente." };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: issue.path.join(".") };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, error: "Pedidos estão desativados neste ambiente: configure o Supabase (veja o README)." };
  }
  if (!isAsaasConfigured()) {
    return { ok: false, error: "Pagamentos estão desativados neste ambiente: configure a ASAAS_API_KEY (veja o README)." };
  }

  try {
    return await createOrder(admin, parsed.data, await getCurrentUser(), await clientIp());
  } catch (e) {
    console.error("[checkout] erro inesperado", e);
    return { ok: false, error: "Não foi possível concluir o pedido agora. Tente novamente em instantes; se o problema continuar, fale conosco." };
  }
}
