import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { isSupabaseConfigured } from "@/lib/env";
import { priceCart } from "@/lib/cart/price-cart";
import { applyPaymentStatus } from "@/lib/payments/apply-status";
import { orderUnlocksDownloads } from "@/lib/orders/state-machine";
import type { AdminSupabase } from "@/lib/supabase/admin";
import { DEMO_PRODUCTS } from "@/lib/demo/catalog-data";
import type { OrderStatus, PaymentMethod, PaymentStatus, Product, ProductFile } from "@/types/domain";

/**
 * 🔬 "Order Studio" — fluxo de demonstração (dev/sem Supabase).
 *
 * Simula, em memória, a fatia do banco que o fluxo de pagamento usa para que a
 * lógica real (applyPaymentStatus, auto-liberação, e-mail e rota de download)
 * possa ser exercitada no localhost: um pedido é criado com produtos digitais do
 * catálogo demo, um pagamento "recebido" é aplicado e o download é liberado.
 * Nada aqui faz chamada a parede, Asaas ou storage reais — tudo é sinalizado como demo.
 */

export const DEMO_SESSION_COOKIE = "confianca_demo_session";
export const DEMO_CUSTOMER = {
  id: "demo-customer-0001",
  profileId: "demo-profile-0001",
  email: "cliente@demo.confianca.local",
  fullName: "Cliente de Demonstração",
};

interface StudioItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  unit_price_cents: number;
  list_price_cents: number;
  quantity: number;
  total_cents: number;
  delivery_days: number;
  products: { product_type: string };
}

interface StudioOrder {
  id: string;
  number: string;
  customer_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  paid_at: string | null;
  access_token: string;
  created_at: string;
  due_at: string | null;
  customers: { email: string; profile_id: string } | null;
}

interface StudioPayment {
  id: string;
  order_id: string;
  provider_payment_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount_cents: number;
}

interface StudioDownload {
  id: string;
  file_id: string;
  product_id: string;
  order_id: string | null;
  customer_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Banco em memória
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

class MemoryTable {
  private rows: Row[] = [];
  all(): Row[] {
    return this.rows;
  }
  clear() {
    this.rows = [];
  }
  insert(record: Row) {
    this.rows.push(record);
  }
  match(filters: Filter[]): Row[] {
    return this.rows.filter((row) => filters.every((f) => f.matches(row)));
  }
  reset(seed: Row[] = []) {
    this.rows = [...seed];
  }
}

type Filter = { matches(row: Row): boolean };

function eq(col: string, value: unknown): Filter {
  return { matches: (row) => row[col] === value };
}
function neq(col: string, value: unknown): Filter {
  return { matches: (row) => row[col] !== value };
}
function inArray(col: string, values: unknown[]): Filter {
  return { matches: (row) => values.includes(row[col]) };
}

const STUDIO_TABLES = ["payments", "orders", "order_items", "downloads", "notifications"] as const;
type TableName = (typeof STUDIO_TABLES)[number];

const studioRows = new Map<TableName, MemoryTable>(STUDIO_TABLES.map((t) => [t, new MemoryTable()]));
const table = (name: TableName) => studioRows.get(name)!;

let orderCounter = 0;
let studioStartedAt: string | null = null;

function resetTables() {
  for (const t of STUDIO_TABLES) table(t).clear();
  orderCounter = 0;
  studioStartedAt = null;
}

function splitColumns(select: string): string[] {
  const cols: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of select) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      cols.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) cols.push(current);
  return cols.map((c) => c.trim()).filter(Boolean);
}

function projectRow(row: Row, select: string): Row {
  const out: Row = {};
  for (const col of splitColumns(select)) {
    if (col.endsWith(")")) {
      // Embutido (ex.: customers(email, profile_id)): usa o objeto já armazenado.
      const name = col.slice(0, col.indexOf("(")).trim();
      out[name] = row[name] ?? null;
    } else {
      out[col] = row[col];
    }
  }
  return out;
}

/**
 * Façade mínima que imita a API do Supabase (select/eq/neq/in/update/insert/
 * maybeSingle/single) para os trechos que o fluxo de pagamento usa.
 */
interface FakeAdmin {
  from(name: TableName): FakeQuery;
  rpc(): never;
}

type AwaitResult = { data: Row | Row[] | null; error: null };

interface FakeQuery {
  select(cols?: string, opts?: { head?: boolean; count?: "exact" | "planned" | "estimated" }): FakeQuery;
  eq(col: string, value: unknown): FakeQuery;
  neq(col: string, value: unknown): FakeQuery;
  in(col: string, values: unknown[]): FakeQuery;
  update(record: Record<string, unknown>): FakeQuery;
  insert(records: Record<string, unknown> | Record<string, unknown>[]): FakeQuery;
  single(): Promise<{ data: Row | null; error: { message: string } | null }>;
  maybeSingle(): Promise<{ data: Row | null; error: null }>;
  then<TResult1 = AwaitResult, TResult2 = never>(
    onfulfilled?: ((value: AwaitResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): Promise<TResult1 | TResult2>;
}

function fakeAdmin(): FakeAdmin {
  function from(name: TableName): FakeQuery {
    const t = table(name);
    let filters: Filter[] = [];
    let update: Record<string, unknown> | null = null;
    let insertRows: Row[] | null = null;
    let select: string | null = null;
    let head: boolean | null = null;

    const query: FakeQuery = {
      select(cols?: string, opts?: { head?: boolean }) {
        select = cols ?? null;
        head = opts?.head ?? null;
        return query;
      },
      eq(col, value) {
        filters = [...filters, eq(col, value)];
        return query;
      },
      neq(col, value) {
        filters = [...filters, neq(col, value)];
        return query;
      },
      in(col, values) {
        filters = [...filters, inArray(col, values)];
        return query;
      },
      update(record) {
        update = { ...(update ?? {}), ...record };
        return query;
      },
      insert(records) {
        insertRows = (Array.isArray(records) ? records : [records]).map((r) => ({ ...r }));
        return query;
      },
      async single() {
        const result = await exec();
        const first = Array.isArray(result.data) ? result.data[0] ?? null : result.data;
        return { data: first, error: first ? null : { message: "PGRST116: no rows" } };
      },
      async maybeSingle() {
        const result = await exec();
        const first = Array.isArray(result.data) ? result.data[0] ?? null : result.data;
        return { data: first, error: null };
      },
      async then<TResult1 = AwaitResult, TResult2 = never>(
        onfulfilled?: ((value: AwaitResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
      ): Promise<TResult1 | TResult2> {
        try {
          const value: AwaitResult = await exec();
          return onfulfilled ? onfulfilled(value) : (value as TResult1);
        } catch (e) {
          if (onrejected) return onrejected(e);
          throw e;
        }
      },
    };

    async function exec(): Promise<{ data: Row | Row[] | null; error: null }> {
      if (insertRows) {
        for (const r of insertRows) t.insert(r);
        if (select) return { data: insertRows.map((r) => projectRow(r, select!)), error: null };
        return { data: null, error: null };
      }
      if (update) {
        for (const row of t.match(filters)) Object.assign(row, update);
        return { data: null, error: null };
      }
      const rows = t.match(filters).map((r) => (select ? projectRow(r, select) : r));
      if (head) return { data: null, error: null };
      return { data: rows, error: null };
    }

    return query;
  }

  return { from, rpc: () => {
    throw new Error("rpc não é usado no fluxo demo");
  } };
}

// ---------------------------------------------------------------------------
// Operações de demonstração
// ---------------------------------------------------------------------------

function pickDemoProduct(): Product {
  const product = DEMO_PRODUCTS.find((p) => p.productType === "digital" && p.files.length > 0);
  if (!product) throw new Error("Nenhum produto digital de demonstração disponível.");
  return product;
}

export async function createStudioOrder(): Promise<{ orderId: string; accessToken: string; providerPaymentId: string }> {
  const product = pickDemoProduct();
  if (!studioStartedAt) {
    studioStartedAt = new Date().toISOString();
    orderCounter = 0;
  }

  const cart = await priceCart([{ productId: product.id, slug: product.slug, quantity: 1 }], undefined, DEMO_CUSTOMER.id);
  const line = cart.lines[0];
  orderCounter += 1;

  const orderId = `demo-order-${String(orderCounter).padStart(4, "0")}`;
  const now = new Date().toISOString();
  const orderRow: StudioOrder = {
    id: orderId,
    number: `DEMO-${String(orderCounter).padStart(4, "0")}`,
    customer_id: DEMO_CUSTOMER.id,
    status: "awaiting_payment",
    payment_status: "pending",
    subtotal_cents: cart.totals.subtotalCents,
    discount_cents: cart.totals.discountCents,
    total_cents: cart.totals.totalCents,
    paid_at: null,
    access_token: randomUUID(),
    created_at: now,
    due_at: now,
    customers: { email: DEMO_CUSTOMER.email, profile_id: DEMO_CUSTOMER.profileId },
  };
  table("orders").insert(orderRow as unknown as Row);

  table("order_items").insert({
    id: `demo-item-${orderCounter}`,
    order_id: orderId,
    product_id: line.product.id,
    product_name: line.product.name,
    product_slug: line.product.slug,
    unit_price_cents: line.quote.unitCents,
    list_price_cents: line.quote.listUnitCents,
    quantity: line.quote.quantity,
    total_cents: line.quote.totalCents,
    delivery_days: line.product.deliveryDays,
    products: { product_type: product.productType },
  });

  const providerPaymentId = `pay_demo_${randomUUID()}`;
  table("payments").insert({
    id: `demo-payment-${orderCounter}`,
    order_id: orderId,
    provider_payment_id: providerPaymentId,
    method: "pix",
    status: "pending",
    amount_cents: cart.totals.totalCents,
  });

  return { orderId, accessToken: orderRow.access_token, providerPaymentId };
}

/** Simula o webhook: aplica a transição de pagamento na máquina real. */
export async function simulateStudioPayment(providerPaymentId: string, next: PaymentStatus): Promise<{ changed: boolean; error?: string }> {
  try {
    const { changed } = await applyPaymentStatus(demoAdmin() as unknown as AdminSupabase, providerPaymentId, next);
    return { changed };
  } catch (e) {
    return { changed: false, error: e instanceof Error ? e.message : String(e) };
  }
}

let studioFeedback: string | null = null;
export function setStudioFeedback(message: string | null) {
  studioFeedback = message;
}

export function resetStudio() {
  resetTables();
  studioFeedback = null;
}

// ---------------------------------------------------------------------------
// Leitura para UI e área do cliente
// ---------------------------------------------------------------------------

export interface StudioOrderView {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paidAt: string | null;
  createdAt: string;
  productName: string;
  productSlug: string;
  providerPaymentId: string;
  fileId: string | null;
  downloadAllowed: boolean;
}

export interface StudioSnapshot {
  startedAt: string | null;
  feedback: string | null;
  orders: StudioOrderView[];
  downloads: { id: string; fileId: string; productId: string; orderId: string | null; createdAt: string }[];
  notifications: { template: string; recipient: string; status: string | null }[];
}

export function getStudioSnapshot(): StudioSnapshot {
  const orders = table("orders").all().map((o) => {
    const order = o as unknown as StudioOrder;
    const item = table("order_items")
      .all()
      .find((i) => i.order_id === order.id) as unknown as StudioItem | undefined;
    const payment = table("payments")
      .all()
      .find((p) => p.order_id === order.id) as unknown as StudioPayment | undefined;
    const product = DEMO_PRODUCTS.find((p) => p.id === item?.product_id);
    const file = product?.files[0] ?? null;
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      paymentStatus: order.payment_status,
      subtotalCents: order.subtotal_cents,
      discountCents: order.discount_cents,
      totalCents: order.total_cents,
      paidAt: order.paid_at,
      createdAt: order.created_at,
      productName: item?.product_name ?? "",
      productSlug: item?.product_slug ?? "",
      providerPaymentId: payment?.provider_payment_id ?? "",
      fileId: file?.id ?? null,
      downloadAllowed: orderUnlocksDownloads(order.status, order.payment_status),
    };
  });
  const downloads = table("downloads").all().map((d) => {
    const row = d as unknown as StudioDownload;
    return {
      id: row.id,
      fileId: row.file_id,
      productId: row.product_id,
      orderId: row.order_id,
      createdAt: row.created_at,
    };
  });
  const notifications = table("notifications").all().map((n) => {
    const row = n as unknown as Record<string, unknown>;
    return {
      template: String(row.template ?? ""),
      recipient: String(row.recipient ?? ""),
      status: row.status == null ? null : String(row.status),
    };
  });
  return { startedAt: studioStartedAt, feedback: studioFeedback, orders, downloads, notifications };
}

export function getStudioFile(fileId: string): ProductFile | null {
  for (const p of DEMO_PRODUCTS) {
    const file = p.files.find((f) => f.id === fileId);
    if (file) return { ...file, productId: p.id };
  }
  return null;
}

export function findEligibleStudioOrderForFile(fileId: string): StudioOrderView | null {
  const file = getStudioFile(fileId);
  if (!file) return null;
  const order = table("orders")
    .all()
    .map((o) => o as unknown as StudioOrder)
    .find((o) => {
      if (!orderUnlocksDownloads(o.status, o.payment_status)) return false;
      return table("order_items")
        .all()
        .some((i) => (i as unknown as StudioItem).order_id === o.id && (i as unknown as StudioItem).product_id === file.productId);
    });
  if (!order) return null;
  const view = getStudioSnapshot().orders.find((o) => o.id === order.id) ?? null;
  return view;
}

// ---------------------------------------------------------------------------
// Sessão de demonstração
// ---------------------------------------------------------------------------

export interface DemoSessionUser {
  id: string;
  email: string;
  fullName: string;
  role: "customer";
  permissions: never[];
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export async function getDemoSessionUser(): Promise<DemoSessionUser | null> {
  if (isSupabaseConfigured) return null;
  const store = await cookies();
  if (store.get(DEMO_SESSION_COOKIE)?.value !== DEMO_CUSTOMER.id) return null;
  return {
    id: DEMO_CUSTOMER.id,
    email: DEMO_CUSTOMER.email,
    fullName: DEMO_CUSTOMER.fullName,
    role: "customer",
    permissions: [],
    mustChangePassword: false,
    lastLoginAt: null,
  };
}

export async function setDemoSession() {
  const store = await cookies();
  store.set(DEMO_SESSION_COOKIE, DEMO_CUSTOMER.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
}

export async function clearDemoSession() {
  const store = await cookies();
  store.delete(DEMO_SESSION_COOKIE);
}

/** Exportado para a rota de download da demo servir o arquivo. */
export const demoAdmin = fakeAdmin;