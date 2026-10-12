import { CartProvider } from "@/components/store/cart-provider";
import { SiteHeader } from "@/components/store/site-header";
import { SiteFooter } from "@/components/store/site-footer";
import { DemoBanner } from "@/components/store/demo-banner";
import { getActiveCategories, getActiveInstitutions } from "@/lib/catalog/queries";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, institutions] = await Promise.all([getActiveCategories(), getActiveInstitutions()]);
  return (
    <CartProvider>
      <DemoBanner />
      <SiteHeader categories={categories} institutions={institutions} />
      <main id="conteudo">{children}</main>
      <SiteFooter />
    </CartProvider>
  );
}