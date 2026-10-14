import { ProductCard } from "./product-card";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/domain";

/** Grade responsiva única para todo o catálogo. Colunas só mudam quando o conteúdo pede. */
export function ProductGrid({
  products,
  className,
  priorityCount = 0,
}: {
  products: Product[];
  className?: string;
  /** Quantos cards carregam a capa com prioridade (acima da dobra). */
  priorityCount?: number;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
