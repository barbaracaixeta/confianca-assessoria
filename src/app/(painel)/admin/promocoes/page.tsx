import { requireAdminPermission } from "@/lib/admin/access";
import type { Metadata } from "next";
import { getAdminPromotions, getPromotionProductOptions } from "@/lib/admin/promotions";
import { PromotionManager } from "./promotion-manager";

export const metadata: Metadata = { title: "Promoções" };
export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  await requireAdminPermission("products.view");
  const [promotions, products] = await Promise.all([getAdminPromotions(), getPromotionProductOptions()]);
  return (
    <div>
      <h1 className="display text-[2.25rem] text-pine">Promoções</h1>
      <p className="mt-1 text-sm text-muted">
        Promoções por percentual ou valor fixo, com período de validade, código de cupom opcional e escopo em produtos específicos ou no catálogo inteiro.
      </p>
      <PromotionManager initial={promotions} products={products} />
    </div>
  );
}