import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AdminCustomerRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  cpfCnpj: string | null;
  profileId: string | null;
  asaasCustomerId: string | null;
  isActive: boolean;
  ordersCount: number;
  paidOrdersCount: number;
  totalSpentCents: number;
  createdAt: string;
}

export interface AdminCustomerOrderRow {
  id: string;
  number: string;
  totalCents: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export interface AdminCustomerDetail extends AdminCustomerRow {
  orders: AdminCustomerOrderRow[];
}

function embeds(value: unknown): Array<Record<string, unknown>> | null {
  if (!value) return null;
  return (Array.isArray(value) ? value : [value]) as Array<Record<string, unknown>>;
}

function summarize(orders: Array<Record<string, unknown>>) {
  const paid = orders.filter((o) => o.payment_status === "confirmed" || o.payment_status === "received");
  const totalSpentCents = paid.reduce((sum, o) => sum + Number(o.total_cents ?? 0), 0);
  return { ordersCount: orders.length, paidOrdersCount: paid.length, totalSpentCents };
}

export async function getAdminCustomers(): Promise<AdminCustomerRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("customers")
    .select(
      "id, full_name, email, phone, cpf_cnpj, profile_id, asaas_customer_id, is_active, created_at, orders(id, total_cents, payment_status)",
    )
    .order("created_at", { ascending: false });
  return (data ?? []).map((c) => {
    const s = summarize(embeds(c.orders) ?? []);
    return {
      id: c.id,
      fullName: c.full_name,
      email: c.email,
      phone: c.phone,
      cpfCnpj: c.cpf_cnpj,
      profileId: c.profile_id,
      asaasCustomerId: c.asaas_customer_id,
      isActive: c.is_active,
      createdAt: c.created_at,
      ...s,
    };
  });
}

export async function getAdminCustomer(id: string): Promise<AdminCustomerDetail | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data: c } = await admin
    .from("customers")
    .select(
      "id, full_name, email, phone, cpf_cnpj, profile_id, asaas_customer_id, is_active, created_at, orders(id, number, total_cents, status, payment_status, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;
  const orders = (embeds(c.orders) ?? [])
    .map((o) => ({
      id: o.id as string,
      number: o.number as string,
      totalCents: o.total_cents as number,
      status: o.status as string,
      paymentStatus: o.payment_status as string,
      createdAt: o.created_at as string,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const s = summarize(orders.map((o) => ({ total_cents: o.totalCents, payment_status: o.paymentStatus })));
  return {
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
    cpfCnpj: c.cpf_cnpj,
    profileId: c.profile_id,
    asaasCustomerId: c.asaas_customer_id,
    isActive: c.is_active,
    createdAt: c.created_at,
    ...s,
    orders,
  };
}
