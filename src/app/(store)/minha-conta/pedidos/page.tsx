import { getMyOrders } from "@/lib/orders/customer-queries";
import { OrderList } from "@/components/store/order-list";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

export default async function MyOrdersPage() {
  const orders = await getMyOrders();
  return (
    <div>
      <h1 className="display text-[3rem] text-pine md:text-[3.6rem]">Pedidos</h1>
      <div className="mt-8">
        {orders.length > 0 ? (
          <OrderList orders={orders} />
        ) : (
          <EmptyState title="Nenhum pedido ainda" description="Quando você comprar um produto, ele aparece aqui." action={<ButtonLink href="/loja">Ver produtos</ButtonLink>} />
        )}
      </div>
    </div>
  );
}
