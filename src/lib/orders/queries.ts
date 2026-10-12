import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/types/domain";

export interface OrderDetail {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
  customerNotes: string | null;
  createdAt: string;
  dueAt: string | null;
  paidAt: string | null;
  accessToken: string;
  customer: { fullName: string; email: string; profileId: string | null };
  items: { id: string; productName: string; productSlug: string; quantity: number; unitPriceCents: number; totalCents: number; notes: string | null }[];
  payment: {
    providerPaymentId: string | null;
    method: PaymentMethod;
    status: PaymentStatus;
    installments: number;
    pixPayload: string | null;
    pixExpiresAt: string | null;
    cardLast4: string | null;
    cardBrand: string | null;
    invoiceUrl: string | null;
  } | null;
  history: { toStatus: OrderStatus; createdAt: string }[];
}

const ORDER_SELECT = `
  id, number, status, payment_status, subtotal_cents, discount_cents, total_cents, coupon_code,
  customer_notes, created_at, due_at, paid_at, access_token,
  customers ( full_name, email, profile_id ),
  order_items ( id, product_name, product_slug, quantity, unit_price_cents, total_cents, details ),
  payments ( provider_payment_id, method, status, installments, pix_payload, pix_expires_at, card_last4, card_brand, invoice_url, created_at ),
  order_status_history ( to_status, created_at )
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrder(row: any): OrderDetail {
  const payments = [...(row.payments ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const p = payments[0];
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    paymentStatus: row.payment_status,
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    totalCents: row.total_cents,
    couponCode: row.coupon_code,
    customerNotes: row.customer_notes,
    createdAt: row.created_at,
    dueAt: row.due_at,
    paidAt: row.paid_at,
    accessToken: row.access_token,
    customer: { fullName: row.customers?.full_name ?? "", email: row.customers?.email ?? "", profileId: row.customers?.profile_id ?? null },
    items: (row.order_items ?? []).map((i: Record<string, unknown>) => ({
      id: i.id,
      productName: i.product_name,
      productSlug: i.product_slug,
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents,
      totalCents: i.total_cents,
      notes: ((i.details as Record<string, unknown> | null)?.notes as string | null) ?? null,
    })),
    payment: p
      ? {
          providerPaymentId: p.provider_payment_id,
          method: p.method,
          status: p.status,
          installments: p.installments,
          pixPayload: p.pix_payload,
          pixExpiresAt: p.pix_expires_at,
          cardLast4: p.card_last4,
          cardBrand: p.card_brand,
          invoiceUrl: p.invoice_url,
        }
      : null,
    history: [...(row.order_status_history ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((h) => ({ toStatus: h.to_status, createdAt: h.created_at })),
  };
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Carrega um pedido autorizando por (1) token de acesso do link enviado ao cliente
 * ou (2) sessão do dono/equipe via RLS. Sem autorização, retorna null (404).
 */
export async function getOrderForViewer(orderId: string, token?: string | null): Promise<OrderDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;

  if (token) {
    const admin = createSupabaseAdminClient();
    if (!admin) return null;
    const { data } = await admin.from("orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
    if (data && safeEqual(String(data.access_token), token)) return mapOrder(data);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.from("orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
  return data ? mapOrder(data) : null;
}
