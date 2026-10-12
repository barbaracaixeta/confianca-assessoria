import Image from "next/image";
import { formatBytes } from "@/lib/files/rules";
import type { Product } from "@/types/domain";

/**
 * Capa editorial do produto: usa a imagem cadastrada ou um motivo de
 * "documento acadêmico" da marca quando ainda não há imagem. Nunca deixa
 * espaço vazio nem imagem quebrada — a marca é o fallback.
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

  const format = product.files?.[0]?.originalName.split(".").pop()?.toUpperCase() ?? "DIGITAL";

  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-[var(--color-green-50)] ${className ?? ""}`} aria-hidden="true">
      {/* Textura sutil: linhas de pauta */}
      <div className="absolute inset-0 opacity-[0.5] [background-image:repeating-linear-gradient(180deg,transparent_0_31px,var(--color-line)_31px_32px)]" />

      {/* Folha de documento */}
      <div className="relative w-[64%] rotate-[-3deg] overflow-hidden rounded-[3px] bg-sheet shadow-[0_20px_44px_-24px_rgb(11_81_57/0.5)]">
        <div className="absolute inset-y-0 left-0 w-[6px] bg-pine" />
        <div className="px-[9%] pt-[12%] pb-[13%] pl-[15%]">
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 12 12" className="size-2.5 text-amber" fill="currentColor">
              <path d="M6 0 7.4 4.6 12 6 7.4 7.4 6 12 4.6 7.4 0 6 4.6 4.6Z" />
            </svg>
            <span className="text-[7px] font-bold tracking-[0.22em] text-green">CONFIANÇA</span>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-2 w-[68%] rounded-sm bg-ink/30" />
            <div className="h-1.5 w-[92%] rounded-sm bg-ink/18" />
            <div className="h-1.5 w-[86%] rounded-sm bg-ink/15" />
            <div className="h-1.5 w-[90%] rounded-sm bg-ink/12" />
            <div className="h-1.5 w-[60%] rounded-sm bg-ink/12" />
          </div>
          <div className="mt-3.5 space-y-1 border-t border-line pt-2">
            <div className="h-px w-full bg-line" />
            <div className="h-px w-3/4 bg-line" />
          </div>
        </div>
      </div>

      <span className="absolute right-3 bottom-3 rounded-[var(--radius-xs)] border border-line bg-sheet/95 px-2 py-0.5 text-[10px] font-bold tracking-wide text-ink-2">
        {format}
      </span>
    </div>
  );
}

/** Tamanho do pacote de entrega (soma dos arquivos). */
export function productBundleSize(product: Product): string | null {
  const bytes = product.files?.reduce((sum, f) => sum + f.sizeBytes, 0) ?? 0;
  return bytes > 0 ? formatBytes(bytes) : null;
}
