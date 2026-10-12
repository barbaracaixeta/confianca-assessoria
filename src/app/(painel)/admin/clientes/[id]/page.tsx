import { requireAdminPermission } from "@/lib/admin/access";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/feedback";
import { getAdminCustomer } from "@/lib/admin/customers";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders/state-machine";
import { formatDate, formatMoney } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Cliente" };
export const dynamic = "force-dynamic";

export default async function AdminCustomerPage({ params }: PageProps<"/admin/clientes/[id]">) {
  await requireAdminPermission("customers.view");
  const { id } = await params;
  const customer = await getAdminCustomer(id);
  if (!customer) notFound();

  return (
    <div className="max-w-[980px]">
      <Link href="/admin/clientes" className="text-sm text-muted hover:text-pine">Clientes</Link>
      <h1 className="display mt-2 text-[2.7rem] text-pine">{customer.fullName || "Cliente"}</h1>

      <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 border-y border-line py-5 text-sm sm:grid-cols-2 md:grid-cols-3">
        <div><dt className="text-xs text-muted">E-mail</dt><dd className="mt-0.5 text-ink">{customer.email}</dd></div>
        <div><dt className="text-xs text-muted">Telefone</dt><dd className="mt-0.5 tabular text-ink">{customer.phone ?? "—"}</dd></div>
        <div><dt className="text-xs text-muted">CPF/CNPJ</dt><dd className="mt-0.5 tabular text-ink">{customer.cpfCnpj ?? "—"}</dd></div>
        <div><dt className="text-xs text-muted">Situação</dt><dd className="mt-0.5"><Badge tone={customer.isActive ? "green" : "danger"}>{customer.isActive ? "Ativa" : "Bloqueada"}</Badge></dd></div>
        <div><dt className="text-xs text-muted">Pedidos</dt><dd className="mt-0.5 tabular text-ink">{customer.ordersCount} ({customer.paidOrdersCount} pagos)</dd></div>
        <div><dt className="text-xs text-muted">Total gasto</dt><dd className="mt-0.5 tabular font-semibold text-pine">{formatMoney(customer.totalSpentCents)}</dd></div>
        <div><dt className="text-xs text-muted">Cliente desde</dt><dd className="mt-0.5 text-ink">{formatDate(customer.createdAt, { dateStyle: "medium" })}</dd></div>
        <div><dt className="text-xs text-muted">Conta vinculada</dt><dd className="mt-0.5 text-ink">{customer.profileId ? "Sim" : "Não"}</dd></div>
        <div><dt className="text-xs text-muted">ID Asaas</dt><dd className="mt-0.5 text-ink">{customer.asaasCustomerId ?? "—"}</dd></div>
      </dl>

      <h2 className="mt-10 text-[1.5rem] text-ink">Pedidos</h2>
      {customer.orders.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Este cliente ainda não fez pedidos.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="pb-2 font-normal">Pedido</th>
                <th className="pb-2 font-normal">Status</th>
                <th className="pb-2 font-normal">Pagamento</th>
                <th className="pb-2 text-right font-normal">Valor</th>
                <th className="pb-2 text-right font-normal">Data</th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="py-3">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-medium tabular text-pine hover:underline">#{o.number}</Link>
                  </td>
                  <td className="py-3 text-ink-2">{ORDER_STATUS_LABEL[o.status as OrderStatus]}</td>
                  <td className="py-3">
                    <Badge tone={o.paymentStatus === "confirmed" || o.paymentStatus === "received" ? "green" : o.paymentStatus === "pending" ? "amber" : "danger"}>
                      {PAYMENT_STATUS_LABEL[o.paymentStatus as PaymentStatus]}
                    </Badge>
                  </td>
                  <td className="py-3 text-right tabular">{formatMoney(o.totalCents)}</td>
                  <td className="py-3 text-right text-muted">{formatDate(o.createdAt, { dateStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}