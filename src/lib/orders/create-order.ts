import "server-only";
import { after } from "next/server";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { priceCart } from "@/lib/cart/price-cart";
import { asaas, AsaasError } from "@/lib/asaas/client";
import { mapAsaasStatus } from "@/lib/asaas/status";
import { applyPaymentStatus } from "@/lib/payments/apply-status";
import { sendEmail } from "@/lib/email/send";
import { getCheckoutSettings } from "@/lib/settings";
import { installmentOptions } from "@/lib/pricing";
import { appUrl } from "@/lib/env";
import type { CheckoutInput } from "@/lib/validation/schemas";
import type { SessionUser } from "@/lib/auth/session";

export type CreateOrderResult =
  | { ok: true; orderId: string; accessToken: string }
  | { ok: false; error: string; field?: string };

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Data no fuso de Brasília (YYYY-MM-DD), como o Asaas espera em dueDate. */
function brDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

/** Aproxima dias úteis para o prazo previsto (seg–sex). */
function addBusinessDays(date: Date, days: number) {
  const d = new Date(date);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

async function upsertCustomer(admin: AdminSupabase, input: CheckoutInput, user: SessionUser | null) {
  const c = input.customer;
  const { data: existing } = await admin.from("customers").select("id, profile_id, asaas_customer_id").eq("email", c.email).maybeSingle();

  // Só vincula à conta logada quando o e-mail é o mesmo da sessão.
  const profileId = user && user.email.toLowerCase() === c.email ? user.id : (existing?.profile_id ?? null);

  if (existing) {
    await admin
      .from("customers")
      .update({ full_name: c.fullName, phone: c.phone, cpf_cnpj: c.cpfCnpj, profile_id: profileId })
      .eq("id", existing.id);
    return { id: existing.id as string, asaasId: existing.asaas_customer_id as string | null, profileId };
  }

  const { data, error } = await admin
    .from("customers")
    .insert({ full_name: c.fullName, email: c.email, phone: c.phone, cpf_cnpj: c.cpfCnpj, profile_id: profileId })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Falha ao registrar cliente: ${error?.message}`);
  return { id: data.id as string, asaasId: null, profileId };
}

async function ensureAsaasCustomer(admin: AdminSupabase, customerId: string, current: string | null, input: CheckoutInput) {
  if (current) return current;
  const c = input.customer;
  const found = await asaas.findCustomerByCpfCnpj(c.cpfCnpj);
  const asaasCustomer =
    found ??
    (await asaas.createCustomer({
      name: c.fullName,
      email: c.email,
      cpfCnpj: c.cpfCnpj,
      mobilePhone: c.phone,
      externalReference: customerId,
      notificationDisabled: true,
    }));
  await admin.from("customers").update({ asaas_customer_id: asaasCustomer.id }).eq("id", customerId);
  return asaasCustomer.id;
}

async function cancelOrder(admin: AdminSupabase, orderId: string) {
  await admin.from("orders").update({ status: "cancelled", payment_status: "cancelled" }).eq("id", orderId);
}

export async function createOrder(
  admin: AdminSupabase,
  input: CheckoutInput,
  user: SessionUser | null,
  remoteIp: string,
): Promise<CreateOrderResult> {
  const customer = await upsertCustomer(admin, input, user);

  // 1. Preço recalculado no servidor — valores enviados pelo navegador são ignorados.
  const cart = await priceCart(input.lines, input.couponCode, customer.id);
  if (cart.lines.length === 0) return { ok: false, error: "Os produtos do carrinho não estão mais disponíveis." };
  if (input.couponCode && cart.coupon?.status !== "applied") {
    return { ok: false, error: cart.coupon?.message ?? "Cupom inválido.", field: "coupon" };
  }
  if (cart.totals.totalCents < 500) return { ok: false, error: "O valor mínimo para pagamento é R$ 5,00." };

  const settings = await getCheckoutSettings();
  const maxDelivery = Math.max(...cart.lines.map((l) => l.product.deliveryDays));

  // 2. Pedido + itens
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      customer_id: customer.id,
      subtotal_cents: cart.totals.subtotalCents,
      discount_cents: cart.totals.discountCents,
      total_cents: cart.totals.totalCents,
      coupon_id: cart.coupon?.couponId ?? null,
      coupon_code: cart.coupon?.status === "applied" ? cart.coupon.code : null,
      customer_notes: input.notes || null,
      due_at: addBusinessDays(new Date(), maxDelivery).toISOString(),
    })
    .select("id, number, access_token")
    .single();
  if (orderError || !order) throw new Error(`Falha ao criar pedido: ${orderError?.message}`);

  const { error: itemsError } = await admin.from("order_items").insert(
    cart.lines.map((l) => ({
      order_id: order.id,
      product_id: l.product.id,
      product_name: l.product.name,
      product_slug: l.product.slug,
      unit_price_cents: l.quote.unitCents,
      list_price_cents: l.quote.listUnitCents,
      quantity: l.quote.quantity,
      total_cents: l.quote.totalCents,
      delivery_days: l.product.deliveryDays,
      details: { notes: l.line.notes ?? null, pricingUnit: l.product.pricingUnit, minApplied: l.quote.minApplied },
    })),
  );
  if (itemsError) {
    await cancelOrder(admin, order.id);
    throw new Error(`Falha ao gravar itens: ${itemsError.message}`);
  }

  // 3. Reserva atômica do cupom (respeita limite total e por cliente sob concorrência)
  if (cart.coupon?.status === "applied" && cart.coupon.couponId) {
    const { data: reserved } = await admin.rpc("reserve_coupon", {
      p_coupon_id: cart.coupon.couponId,
      p_order_id: order.id,
      p_customer_id: customer.id,
      p_discount_cents: cart.totals.discountCents,
    });
    if (!reserved) {
      await cancelOrder(admin, order.id);
      return { ok: false, error: "Este cupom acabou de atingir o limite de uso.", field: "coupon" };
    }
  }

  // 4. Cobrança no Asaas
  try {
    const asaasCustomerId = await ensureAsaasCustomer(admin, customer.id, customer.asaasId, input);
    const total = cart.totals.totalCents / 100;
    const description = `Pedido ${order.number} — Confiança Assessoria Acadêmica`;

    if (input.method === "pix") {
      const payment = await asaas.createPayment({
        customer: asaasCustomerId,
        billingType: "PIX",
        value: total,
        dueDate: brDate(addDays(new Date(), Math.ceil(settings.pixExpiresInHours / 24))),
        description,
        externalReference: order.id,
      });
      const qr = await asaas.getPixQrCode(payment.id);
      await admin.from("payments").insert({
        order_id: order.id,
        provider_payment_id: payment.id,
        method: "pix",
        status: "pending",
        amount_cents: cart.totals.totalCents,
        pix_payload: qr.payload,
        pix_expires_at: new Date(qr.expirationDate.replace(" ", "T") + "-03:00").toISOString(),
        invoice_url: payment.invoiceUrl,
        due_date: payment.dueDate,
      });
    } else {
      const allowed = installmentOptions(cart.totals.totalCents, settings.maxInstallments, settings.minInstallmentCents);
      if (!allowed.some((o) => o.count === input.card.installments)) {
        await cancelOrder(admin, order.id);
        return { ok: false, error: "Número de parcelas indisponível para este valor.", field: "installments" };
      }
      const card = input.card;
      const installments = card.installments;
      // Os dados do cartão seguem direto ao Asaas e não são gravados nem registrados em log.
      const payment = await asaas.createPayment({
        customer: asaasCustomerId,
        billingType: "CREDIT_CARD",
        dueDate: brDate(new Date()),
        description,
        externalReference: order.id,
        ...(installments > 1 ? { installmentCount: installments, totalValue: total } : { value: total }),
        creditCard: {
          holderName: card.holderName,
          number: card.number,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          ccv: card.ccv,
        },
        creditCardHolderInfo: {
          name: input.customer.fullName,
          email: input.customer.email,
          cpfCnpj: input.customer.cpfCnpj,
          postalCode: card.postalCode,
          addressNumber: card.addressNumber,
          phone: input.customer.phone,
        },
        remoteIp,
      });
      await admin.from("payments").insert({
        order_id: order.id,
        provider_payment_id: payment.id,
        method: "credit_card",
        status: "pending",
        amount_cents: cart.totals.totalCents,
        installments,
        card_last4: payment.creditCard?.creditCardNumber?.slice(-4) ?? card.number.slice(-4),
        card_brand: payment.creditCard?.creditCardBrand ?? null,
        invoice_url: payment.invoiceUrl,
        due_date: payment.dueDate,
      });
      // Resposta síncrona do Asaas (servidor ↔ servidor). O webhook confirma de novo, de forma idempotente.
      const status = mapAsaasStatus(payment.status);
      if (status !== "pending") await applyPaymentStatus(admin, payment.id, status, { paidAt: payment.confirmedDate ?? null });
    }
  } catch (e) {
    await cancelOrder(admin, order.id);
    if (e instanceof AsaasError) {
      console.error("[checkout] Asaas", e.status, e.details);
      return { ok: false, error: e.userMessage, field: input.method === "credit_card" ? "card" : undefined };
    }
    throw e;
  }

  const orderUrl = `${appUrl}/pedido/${order.id}?t=${order.access_token}`;
  after(() =>
    sendEmail(admin, input.customer.email, { name: "order_created", data: { orderNumber: order.number, totalCents: cart.totals.totalCents, orderUrl } }, customer.profileId),
  );

  return { ok: true, orderId: order.id, accessToken: order.access_token };
}
