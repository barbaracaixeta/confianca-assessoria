import { requireAdminPermission } from "@/lib/admin/access";
import type { Metadata } from "next";
import { getAdminPriceTiers, getPricingProducts } from "@/lib/admin/pricing";
import { PriceTierManager } from "./price-tier-manager";

export const metadata: Metadata = { title: "Preços" };
export const dynamic = "force-dynamic";

export default async function AdminPricesPage() {
  await requireAdminPermission("products.view");
  const products = await getPricingProducts();
  const initialProductId = products[0]?.id ?? null;
  const initialTiers = initialProductId ? await getAdminPriceTiers(initialProductId) : [];
  return (
    <div>
      <h1 className="display text-[2.25rem] text-pine">Preços</h1>
      <p className="mt-1 text-sm text-muted">
        Defina faixas de preço por quantidade para cada produto. A partir da quantidade mínima de uma faixa, o preço unitário dela é aplicado no lugar do preço base.
      </p>
      <PriceTierManager products={products} initialProductId={initialProductId} initialTiers={initialTiers} />
    </div>
  );
}