import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrder, getStaffOptions } from "@/lib/admin/orders";
import { OrderDetail } from "./order-detail";

export const metadata: Metadata = { title: "Pedido" };
export const dynamic = "force-dynamic";

export default async function AdminOrderPage({ params }: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await params;
  const [order, staff] = await Promise.all([getAdminOrder(id), getStaffOptions()]);
  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/pedidos" className="text-sm text-muted hover:text-pine">Pedidos</Link>
      <h1 className="display mt-2 text-[2.25rem] text-pine">Pedido #{order.number}</h1>
      <OrderDetail order={order} staff={staff} />
    </div>
  );
}