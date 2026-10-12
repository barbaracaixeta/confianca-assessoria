import type { Metadata } from "next";
import { getAdminOrders } from "@/lib/admin/orders";
import { OrderTable } from "./order-table";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();
  return (
    <div>
      <h1 className="display text-[2.25rem] text-pine">Pedidos</h1>
      <p className="mt-1 text-sm text-muted">
        Todos os pedidos da loja. Abra um pedido para gerenciar status, prazo e equipe responsável.
      </p>
      <OrderTable rows={orders} />
    </div>
  );
}