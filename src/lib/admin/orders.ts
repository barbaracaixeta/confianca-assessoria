import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AdminOrderRow {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  status: string;
  paymentStatus: string;
  couponCode: string | null;
  itemsCount: number;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminOrderItemRow {
  id: string;
  productId: string | null;
  productName: string;
  productSlug: string;
  unitPriceCents: number;
  listPriceCents: number;
  quantity: number;
  totalCents: number;
  deliveryDays: number;
  details: Record<string, unknown>;
}

export interface AdminOrderPaymentRow {
  id: string;
  method: string;
  status: string;
  amountCents: number;
  installments: number;
  provider: string;
  providerPaymentId: string | null;
  invoiceUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminOrderHistoryRow {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface AdminOrderDetail {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
  customerNotes: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueAt: string | null;
  paidAt: string | null;
  accessToken: string;
  createdAt: string;
  customer: { id: string; fullName: string; email: string; phone: string | null; cpfCnpj: string | null } | null;
  items: AdminOrderItemRow[];
  payments: AdminOrderPaymentRow[];
  history: AdminOrderHistoryRow[];
}

export interface StaffOption {
  id: string;
  name: string;
}

function embeds(value: unknown): Array<Record<string, unknown>> | null {
  if (!value) return null;
  return (Array.isArray(value) ? value : [value]) as Array<Record<string, unknown>>;
}

export async function getAdminOrders(): Promise<AdminOrderRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("orders")
    .select(
      "id, number, total_cents, subtotal_cents, discount_cents, status, payment_status, coupon_code, created_at, paid_at, customers(full_name, email), order_items(id)",
    )
    .order("created_at", { ascending: false });
  return (data ?? []).map((o) => {
    const customer = embeds(o.customers)?.[0];
    return {
      id: o.id,
      number: o.number,
      customerName: (customer?.full_name as string | undefined) ?? "",
      customerEmail: (customer?.email as string | undefined) ?? "",
      totalCents: o.total_cents,
      subtotalCents: o.subtotal_cents,
      discountCents: o.discount_cents,
      status: o.status,
      paymentStatus: o.payment_status,
      couponCode: o.coupon_code,
      itemsCount: (embeds(o.order_items) ?? []).length,
      createdAt: o.created_at,
      paidAt: o.paid_at,
    };
  });
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data: o } = await admin
    .from("orders")
    .select(
      "id, number, status, payment_status, subtotal_cents, discount_cents, total_cents, coupon_code, customer_notes, assignee_id, due_at, paid_at, access_token, created_at, assignee:profiles(full_name), customers(id, full_name, email, phone, cpf_cnpj), order_items(id, product_id, product_name, product_slug, unit_price_cents, list_price_cents, quantity, total_cents, delivery_days, details), payments(id, method, status, amount_cents, installments, provider, provider_payment_id, invoice_url, paid_at, created_at), order_status_history(id, from_status, to_status, note, changed_by, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!o) return null;

  const customer = embeds(o.customers)?.[0];
  const assignee = embeds(o.assignee)?.[0];

  return {
    id: o.id,
    number: o.number,
    status: o.status,
    paymentStatus: o.payment_status,
    subtotalCents: o.subtotal_cents,
    discountCents: o.discount_cents,
    totalCents: o.total_cents,
    couponCode: o.coupon_code,
    customerNotes: o.customer_notes,
    assigneeId: o.assignee_id,
    assigneeName: (assignee?.full_name as string | undefined) ?? null,
    dueAt: o.due_at,
    paidAt: o.paid_at,
    accessToken: o.access_token,
    createdAt: o.created_at,
    customer: customer
      ? {
          id: customer.id as string,
          fullName: (customer.full_name as string) ?? "",
          email: (customer.email as string) ?? "",
          phone: (customer.phone as string | null) ?? null,
          cpfCnpj: (customer.cpf_cnpj as string | null) ?? null,
        }
      : null,
    items: (embeds(o.order_items) ?? []).map((i) => ({
      id: i.id as string,
      productId: (i.product_id as string | null) ?? null,
      productName: i.product_name as string,
      productSlug: i.product_slug as string,
      unitPriceCents: i.unit_price_cents as number,
      listPriceCents: i.list_price_cents as number,
      quantity: i.quantity as number,
      totalCents: i.total_cents as number,
      deliveryDays: i.delivery_days as number,
      details: (i.details as Record<string, unknown>) ?? {},
    })),
    payments: (embeds(o.payments) ?? []).map((p) => ({
      id: p.id as string,
      method: p.method as string,
      status: p.status as string,
      amountCents: p.amount_cents as number,
      installments: p.installments as number,
      provider: p.provider as string,
      providerPaymentId: (p.provider_payment_id as string | null) ?? null,
      invoiceUrl: (p.invoice_url as string | null) ?? null,
      paidAt: (p.paid_at as string | null) ?? null,
      createdAt: p.created_at as string,
    })),
    history: (embeds(o.order_status_history) ?? [])
      .map((h) => ({
        id: h.id as string,
        fromStatus: (h.from_status as string | null) ?? null,
        toStatus: h.to_status as string,
        note: (h.note as string | null) ?? null,
        changedBy: (h.changed_by as string | null) ?? null,
        createdAt: h.created_at as string,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

export async function getStaffOptions(): Promise<StaffOption[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .neq("role", "customer")
    .order("full_name");
  return (data ?? []).map((p) => ({ id: p.id, name: p.full_name || p.email }));
}
