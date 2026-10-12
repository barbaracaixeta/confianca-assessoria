import type { Metadata } from "next";
import { getAdminCustomers } from "@/lib/admin/customers";
import { requireAdminArea } from "@/lib/admin/access";
import { CustomerManager } from "./customer-manager";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const [customers, user] = await Promise.all([getAdminCustomers(), requireAdminArea()]);
  const canManage = user.role === "admin" || user.role === "super_admin";
  return (
    <div>
      <h1 className="display text-[2.25rem] text-pine">Clientes</h1>
      <p className="mt-1 text-sm text-muted">
        Base de clientes da loja, com histórico de pedidos e total gasto.
      </p>
      <CustomerManager rows={customers} canManage={canManage} />
    </div>
  );
}