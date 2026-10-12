import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaymentMethod, PaymentStatus } from "@/types/domain";

export interface AdminPaymentRow {
  id: string;
  orderId: string;
  orderNumber: string;
  provider: string;
  providerPaymentId: string | null;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  installments: number;
  pixPayload: string | null;
  pixExpiresAt: string | null;
  invoiceUrl: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  failureReason: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentEvent {
  id: string;
  provider: string;
  providerEventId: string;
  event: string;
  providerPaymentId: string | null;
  payload: unknown;
  processedAt: string | null;
  error: string | null;
  receivedAt: string;
}

function embeds(value: unknown): Array<Record<string, unknown>> | null {
  if (!value) return null;
  return (Array.isArray(value) ? value : [value]) as Array<Record<string, unknown>>;
}

export async function getAdminPayments(): Promise<AdminPaymentRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("payments")
    .select(
      "id, order_id, provider, provider_payment_id, method, status, amount_cents, installments, pix_payload, pix_expires_at, invoice_url, card_last4, card_brand, failure_reason, due_date, paid_at, created_at, updated_at, orders(number)",
    )
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id,
    orderId: p.order_id,
    orderNumber: (embeds(p.orders)?.[0]?.number as string | undefined) ?? "—",
    provider: p.provider,
    providerPaymentId: p.provider_payment_id,
    method: p.method as PaymentMethod,
    status: p.status as PaymentStatus,
    amountCents: p.amount_cents,
    installments: p.installments,
    pixPayload: p.pix_payload,
    pixExpiresAt: p.pix_expires_at,
    invoiceUrl: p.invoice_url,
    cardLast4: p.card_last4,
    cardBrand: p.card_brand,
    failureReason: p.failure_reason,
    dueDate: p.due_date,
    paidAt: p.paid_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

export async function getPaymentEvents(providerPaymentId: string): Promise<AdminPaymentEvent[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("payment_events")
    .select("id, provider, provider_event_id, event, provider_payment_id, payload, processed_at, error, received_at")
    .eq("provider_payment_id", providerPaymentId)
    .order("received_at", { ascending: false });
  return (data ?? []).map((e) => ({
    id: e.id,
    provider: e.provider,
    providerEventId: e.provider_event_id,
    event: e.event,
    providerPaymentId: e.provider_payment_id,
    payload: e.payload,
    processedAt: e.processed_at,
    error: e.error,
    receivedAt: e.received_at,
  }));
}
