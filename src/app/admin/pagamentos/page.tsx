import type { Metadata } from "next";
import { getAdminPayments } from "@/lib/admin/payments";
import { PaymentManager } from "./payment-manager";

export const metadata: Metadata = { title: "Pagamentos" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const payments = await getAdminPayments();
  return (
    <div className="max-w-[1180px]">
      <h1 className="display text-[2.25rem] text-pine">Pagamentos</h1>
      <p className="mt-1 text-sm text-muted">
        Cobranças Pix e cartão com status sincronizado pelo provedor. Expanda um pagamento para ver os eventos de webhook recebidos.
      </p>
      <PaymentManager initial={payments} />
    </div>
  );
}
