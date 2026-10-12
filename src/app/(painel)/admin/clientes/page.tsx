import { requireAdminPermission } from "@/lib/admin/access";
import type { Metadata } from "next";
import { getAdminCustomers } from "@/lib/admin/customers";
import { hasPermission } from "@/lib/auth/session";
import { CustomerManager } from "./customer-manager";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const [customers, viewer] = await Promise.all([getAdminCustomers(), requireAdminPermission("customers.view")]);
  const canManage = hasPermission(viewer, "customers.edit");
  return (
    <div>
      <h1 className="display text-[2.7rem] text-pine">Clientes</h1>
      <p className="mt-1 text-sm text-muted">
        Base de clientes da loja, com histórico de pedidos e total gasto.
      </p>
      <CustomerManager rows={customers} canManage={canManage} />
    </div>
  );
}