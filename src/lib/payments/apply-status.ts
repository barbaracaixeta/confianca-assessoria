import "server-only";
import { after } from "@/lib/orders/after";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { canTransitionPayment, isPaid, orderStatusAfterPaymentAuto } from "@/lib/orders/state-machine";
import { sendEmail } from "@/lib/email/send";
import { appUrl } from "@/lib/env";
import type { OrderStatus, PaymentStatus } from "@/types/domain";

interface ApplyOptions {
  failureReason?: string | null;
  paidAt?: string | null;
}

/**
 * Único ponto que altera o status de pagamento. Chamado pelo webhook e pela
 * conferência server-side com o Asaas — nunca a partir de dados do navegador.
 * Idempotente: repetir o mesmo status não gera efeitos duplicados.
 */
export async function applyPaymentStatus(
  admin: AdminSupabase,
  providerPaymentId: string,
  next: PaymentStatus,
  opts: ApplyOptions = {},
): Promise<{ changed: boolean }> {
  const { data: payment } = await admin
    .from("payments")
    .select("id, status, order_id")
    .eq("provider_payment_id", providerPaymentId)
    .maybeSingle();
  if (!payment) return { changed: false };

  const current = payment.status as PaymentStatus;
  if (current === next || !canTransitionPayment(current, next)) return { changed: false };

  const paidAt = isPaid(next) ? (opts.paidAt ?? new Date().toISOString()) : null;
  await admin
    .from("payments")
    .update({ status: next, paid_at: paidAt, failure_reason: opts.failureReason ?? null })
    .eq("id", payment.id);

  const { data: order } = await admin
    .from("orders")
    .select("id, number, status, payment_status, paid_at, access_token, customers(email, profile_id)")
    .eq("id", payment.order_id)
    .single();
  if (!order) return { changed: true };

  const nextOrderStatus = orderStatusAfterPaymentAuto(
    order.status as OrderStatus,
    next,
    isPaid(next) && (await isDigitalOrder(admin, order.id)),
  );
  const autoRelease = isPaid(next) && nextOrderStatus === "completed";
  await admin
    .from("orders")
    .update({
      payment_status: next,
      status: autoRelease ? "completed" : nextOrderStatus,
      paid_at: isPaid(next) ? (order.paid_at ?? paidAt) : order.paid_at,
    })
    .eq("id", order.id);

  const customer = order.customers as unknown as { email: string; profile_id: string | null } | null;
  if (customer && isPaid(next) && !isPaid(order.payment_status as PaymentStatus)) {
    const orderUrl = `${appUrl}/pedido/${order.id}?t=${order.access_token}`;
    const productsUrl = customer.profile_id ? `${appUrl}/minha-conta/produtos` : orderUrl;
    if (autoRelease) {
      after(() => sendEmail(admin, customer.email, { name: "product_available", data: { orderNumber: order.number, orderUrl, productsUrl } }, customer.profile_id));
    } else {
      after(() => sendEmail(admin, customer.email, { name: "payment_confirmed", data: { orderNumber: order.number, orderUrl } }, customer.profile_id));
    }
  }

  return { changed: true };
}

/**
 * Pedido é liberado automaticamente quando todos os itens são produtos
 * digitais — a entrega não depende de ação da equipe.
 */
async function isDigitalOrder(admin: AdminSupabase, orderId: string): Promise<boolean> {
  const { data: items } = await admin
    .from("order_items")
    .select("products(product_type)")
    .eq("order_id", orderId);
  if (!items || items.length === 0) return false;
  return items.every((row) => {
    const product = row.products as unknown as { product_type: string } | null;
    return product?.product_type === "digital";
  });
}
