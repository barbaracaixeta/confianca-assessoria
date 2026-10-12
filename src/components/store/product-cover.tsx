import Image from "next/image";
import { formatBytes } from "@/lib/files/rules";
import type { Product } from "@/types/domain";

/**
 * Capa editorial do produto: usa a imagem cadastrada ou um motivo de
 * "documento acadêmico" da marca quando ainda não há imagem.
 */
export function ProductCover({ product, className }: { product: Product; className?: string }) {
  if (product.imageUrl) {
    return (
      <Image
        src={product.imageUrl}
        alt={`Capa do produto ${product.name}`}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className={`object-cover ${className ?? ""}`}
      />
    );
  }

  const format = product.files?.[0]?.originalName.split(".").pop()?.toUpperCase();

  return (
    <div className={`relative flex h-full w-full items-end justify-start overflow-hidden bg-green-50 ${className ?? ""}`} aria-hidden="true">
      {/* Papel */}
      <div className="absolute top-1/2 left-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] bg-sheet px-[6%] pt-6 pb-[9%] shadow-[0_18px_40px_-24px_rgb(11_81_57/0.45)]">
        <div className="space-y-1.5">
          <div className="h-1 w-1/3 rounded-full bg-green" />
          <div className="h-2 w-4/5 rounded-sm bg-ink/25" />
          <div className="h-2 w-3/4 rounded-sm bg-ink/20" />
          <div className="h-2 w-5/6 rounded-sm bg-ink/15" />
          <div className="mt-2 space-y-0.5">
            <div className="h-px w-full bg-line" />
            <div className="h-px w-full bg-line" />
            <div className="h-px w-1/2 bg-line" />
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <svg viewBox="0 0 12 12" className="size-2.5 text-green" fill="currentColor" aria-hidden="true">
              <path d="M6 0 7.4 4.6 12 6 7.4 7.4 6 12 4.6 7.4 0 6 4.6 4.6Z" />
            </svg>
            <div className="h-px w-6 bg-amber" />
          </div>
        </div>
      </div>
      {format && (
        <span className="absolute right-2.5 bottom-2.5 rounded-[var(--radius-xs)] border border-line bg-sheet/95 px-2 py-0.5 text-[11px] font-bold text-ink-2">
          {format}
        </span>
      )}
    </div>
  );
}

/** Tamanho em tela cheia do pacote de entrega (soma dos arquivos). */
export function productBundleSize(product: Product): string | null {
  const bytes = product.files?.reduce((sum, f) => sum + f.sizeBytes, 0) ?? 0;
  return bytes > 0 ? formatBytes(bytes) : null;
}