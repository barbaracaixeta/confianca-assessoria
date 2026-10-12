import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export interface DashboardMetrics {
  revenueTodayCents: number;
  revenueMonthCents: number;
  ordersToday: number;
  ordersMonth: number;
  avgTicketCents: number;
  awaitingPayment: number;
  inProduction: number;
  completed: number;
  newCustomersMonth: number;
  conversionRate: number;
  daily: { day: string; revenueCents: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenueCents: number }[];
  topCoupons: { code: string; uses: number; discountCents: number }[];
  isDemo: boolean;
}

export interface RecentOrder {
  id: string;
  number: string;
  customerName: string;
  totalCents: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

/**
 * ⚠️ Dados FICTÍCIOS — exibidos somente em desenvolvimento sem Supabase, para
 * visualizar o painel. Sinalizados na interface; nunca usados em produção.
 */
function demoMetrics(): DashboardMetrics {
  const today = new Date();
  const daily = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const wave = Math.sin(i / 3.2) * 0.35 + 1;
    const orders = Math.max(0, Math.round(wave * 3 + (i % 7 === 0 ? -2 : 0)));
    return { day: d.toISOString().slice(0, 10), orders, revenueCents: orders * 31900 + (i % 4) * 4500 };
  });
  return {
    revenueTodayCents: daily.at(-1)!.revenueCents,
    revenueMonthCents: daily.slice(-10).reduce((s, d) => s + d.revenueCents, 0),
    ordersToday: daily.at(-1)!.orders,
    ordersMonth: daily.slice(-10).reduce((s, d) => s + d.orders, 0),
    avgTicketCents: 31900,
    awaitingPayment: 3,
    inProduction: 7,
    completed: 18,
    newCustomersMonth: 11,
    conversionRate: 72.4,
    daily,
    topProducts: [
      { name: "Formatação ABNT", quantity: 14, revenueCents: 168000 },
      { name: "Orientação de TCC", quantity: 3, revenueCents: 267000 },
      { name: "Revisão acadêmica", quantity: 6, revenueCents: 91000 },
      { name: "Artigo científico", quantity: 2, revenueCents: 84000 },
    ],
    topCoupons: [{ code: "CONFIANCA10", uses: 5, discountCents: 18400 }],
    isDemo: true,
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  if (!isSupabaseConfigured) return demoMetrics();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase!.rpc("admin_dashboard_metrics", { p_tz: "America/Sao_Paulo" });
  if (error) throw new Error(`Falha ao carregar métricas: ${error.message}`);
  const m = data as Record<string, unknown>;
  const num = (k: string) => Number(m[k] ?? 0);
  return {
    revenueTodayCents: num("revenue_today_cents"),
    revenueMonthCents: num("revenue_month_cents"),
    ordersToday: num("orders_today"),
    ordersMonth: num("orders_month"),
    avgTicketCents: num("avg_ticket_cents"),
    awaitingPayment: num("awaiting_payment"),
    inProduction: num("in_production"),
    completed: num("completed"),
    newCustomersMonth: num("new_customers_month"),
    conversionRate: num("conversion_rate"),
    daily: ((m.daily as { day: string; revenue_cents: number; orders: number }[]) ?? []).map((d) => ({
      day: d.day,
      revenueCents: Number(d.revenue_cents),
      orders: Number(d.orders),
    })),
    topProducts: ((m.top_products as { name: string; quantity: number; revenue_cents: number }[]) ?? []).map((p) => ({
      name: p.name,
      quantity: p.quantity,
      revenueCents: Number(p.revenue_cents),
    })),
    topCoupons: ((m.top_coupons as { code: string; uses: number; discount_cents: number }[]) ?? []).map((c) => ({
      code: c.code,
      uses: c.uses,
      discountCents: Number(c.discount_cents),
    })),
    isDemo: false,
  };
}

export async function getRecentOrders(limit = 8): Promise<RecentOrder[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase!
    .from("orders")
    .select("id, number, total_cents, status, payment_status, created_at, customers(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((o) => ({
    id: o.id,
    number: o.number,
    customerName: (o.customers as unknown as { full_name: string } | null)?.full_name ?? "",
    totalCents: o.total_cents,
    status: o.status,
    paymentStatus: o.payment_status,
    createdAt: o.created_at,
  }));
}
