import Link from "next/link";
import { Badge } from "@/components/ui/feedback";
import { ORDER_STATUS_LABEL } from "@/lib/orders/state-machine";
import { formatDate, formatMoney } from "@/lib/utils";
import type { CustomerOrderRow } from "@/lib/orders/customer-queries";
import type { OrderStatus } from "@/types/domain";

const tone = (s: OrderStatus) =>
  s === "cancelled" ? "danger" : s === "awaiting_payment" || s === "awaiting_files" || s === "awaiting_approval" ? "amber" : s === "completed" || s === "delivered" ? "green" : "neutral";

export function OrderList({ orders }: { orders: CustomerOrderRow[] }) {
  return (
    <ul className="border-t border-line">
      {orders.map((o) => (
        <li key={o.id} className="group relative grid gap-2 border-b border-line py-5 transition-colors hover:bg-green-50/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3">
          <div>
            <p className="flex flex-wrap items-center gap-3">
              <Link href={`/minha-conta/pedidos/${o.id}`} className="font-serif text-lg text-ink tabular after:absolute after:inset-0 group-hover:text-pine">
                #{o.number}
              </Link>
              <Badge tone={tone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge>
            </p>
            <p className="mt-1 text-sm text-muted">{o.itemNames.join(", ")}</p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="tabular text-ink">{formatMoney(o.totalCents)}</p>
            <p className="text-muted">{formatDate(o.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
