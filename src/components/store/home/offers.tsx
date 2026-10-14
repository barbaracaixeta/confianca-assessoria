import { ProductGrid } from "@/components/store/product-grid";
import { SectionHeader } from "@/components/store/section-header";
import type { Product } from "@/types/domain";

/** Ofertas ativas, com preço e percentual calculados a partir do preço real. */
export function HomeOffers({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="ofertas-titulo" className="border-y border-line bg-amber-50/50">
      <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-28">
        <SectionHeader
          id="ofertas-titulo"
          eyebrow="Condições especiais"
          title="Ofertas selecionadas"
          description="Materiais digitais com desconto por tempo limitado."
          href="/loja?ofertas=1"
          linkLabel="Ver ofertas"
          tone="amber"
        />
        <ProductGrid products={products.slice(0, 4)} className="mt-12" />
      </div>
    </section>
  );
}
