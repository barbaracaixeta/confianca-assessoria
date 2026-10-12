import { CartProvider } from "@/components/store/cart-provider";
import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { DemoBanner } from "@/components/store/demo-banner";
import { getActiveCategories } from "@/lib/catalog/queries";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const categories = await getActiveCategories();
  return (
    <CartProvider>
      <DemoBanner />
      <SiteHeader categories={categories} />
      <main id="conteudo">{children}</main>
      <SiteFooter />
    </CartProvider>
  );
}