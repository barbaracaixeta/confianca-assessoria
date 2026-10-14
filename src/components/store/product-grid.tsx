import { ProductCard } from "./product-card";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/domain";

/** Grade única do catálogo: 1 coluna no celular, 2 no tablet, 4 no desktop. */
export function ProductGrid({
  products,
  className,
  priorityCount = 0,
  stagger = false,
}: {
  products: Product[];
  className?: string;
  /** Quantos cards carregam a capa com prioridade (acima da dobra). */
  priorityCount?: number;
  /** Entrada suave em cascata (usada na página inicial). */
  stagger?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {products.map((p, i) => (
        <div key={p.id} className={stagger ? "reveal" : undefined} style={stagger ? { animationDelay: `${i * 50}ms` } : undefined}>
          <ProductCard product={p} priority={i < priorityCount} />
        </div>
      ))}
    </div>
  );
}
