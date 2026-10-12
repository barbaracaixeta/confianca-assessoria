import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getMyOrders } from "@/lib/orders/customer-queries";
import { OrderList } from "@/components/store/order-list";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

const NEEDS_ACTION = ["awaiting_payment", "payment_confirmed"];

export default async function AccountHome() {
  const [user, orders] = await Promise.all([requireUser(), getMyOrders()]);
  const firstName = user.fullName.split(" ")[0] || "por aqui";
  const pending = orders.filter((o) => NEEDS_ACTION.includes(o.status));
  const done = orders.filter((o) => o.status === "delivered" || o.status === "completed");

  return (
    <div>
      <h1 className="display text-[2.5rem] text-pine md:text-[3.2rem]">Olá, {firstName}</h1>

      <dl className="mt-10 grid grid-cols-3 border-y border-line">
        {[
          ["Pedidos", orders.length],
          ["Pendências", pending.length],
          ["Concluídos", done.length],
        ].map(([label, n], i) => (
          <div key={label} className={i > 0 ? "border-line py-5 pl-5 max-md:odd:border-l-0 max-md:odd:pl-0 md:border-l" : "py-5"}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className={`mt-1 font-display font-bold text-3xl tabular ${label === "Pendências" && Number(n) > 0 ? "text-amber-ink" : "text-ink"}`}>{n}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[1.8rem] text-ink">Meus produtos</h2>
            <Link href="/minha-conta/produtos" className="text-sm text-pine hover:underline">Abrir</Link>
          </div>
          <div className="mt-4">
            <EmptyState
              title="Seus produtos ficam aqui"
              description="Depois do pagamento aprovado, os materiais comprados aparecem em Meus produtos, prontos para baixar."
            />
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[1.8rem] text-ink">Pedidos recentes</h2>
            {orders.length > 5 && <Link href="/minha-conta/pedidos" className="text-sm text-pine hover:underline">Ver todos</Link>}
          </div>
          <div className="mt-4">
            {orders.length > 0 ? (
              <OrderList orders={orders.slice(0, 5)} />
            ) : (
              <EmptyState
                title="Nenhum pedido ainda"
                description="Pedidos feitos com o seu e-mail aparecem aqui automaticamente, inclusive compras feitas antes de criar a conta."
                action={<ButtonLink href="/loja">Ver produtos</ButtonLink>}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}