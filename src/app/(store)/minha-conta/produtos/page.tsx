import { getMyPurchasedProducts } from "@/lib/orders/customer-queries";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PurchasedProductCard } from "./purchased-product";

export const dynamic = "force-dynamic";

export default async function MyProductsPage() {
  const products = await getMyPurchasedProducts();
  const totalFiles = products.reduce((n, p) => n + p.files.length, 0);

  return (
    <div>
      <h1 className="display text-[3rem] text-pine md:text-[3.6rem]">Meus produtos</h1>
      <p className="mt-3 max-w-[56ch] text-muted">
        {totalFiles > 0
          ? `${products.length} ${products.length === 1 ? "produto liberado" : "produtos liberados"} para download. Os links são temporários e podem ser usados quantas vezes você quiser.`
          : "Os materiais que você comprar aparecem aqui assim que o pagamento for confirmado."}
      </p>

      <div className="mt-10 space-y-4">
        {products.map((p) => (
          <PurchasedProductCard key={p.productId} product={p} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="Você ainda não tem produtos liberados"
            description="Quando o pagamento for confirmado, os materiais aparecem aqui automaticamente para download."
            action={<ButtonLink href="/loja">Ver produtos</ButtonLink>}
          />
        </div>
      )}
    </div>
  );
}