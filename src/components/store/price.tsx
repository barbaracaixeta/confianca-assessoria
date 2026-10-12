import { cn, formatMoney } from "@/lib/utils";
import type { PriceQuote } from "@/lib/pricing";

/** Exibe preço com preço anterior riscado e selo de desconto calculado. */
export function Price({
  quote,
  size = "md",
  prefix,
  className,
}: {
  quote: PriceQuote;
  size?: "sm" | "md" | "lg";
  prefix?: string;
  className?: string;
}) {
  const main = { sm: "text-base", md: "text-xl", lg: "text-4xl" }[size];
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      {prefix && <span className="text-xs text-muted">{prefix}</span>}
      <span className={cn("font-serif font-medium tabular text-ink", main)} style={{ fontVariationSettings: '"opsz" 36' }}>
        {formatMoney(quote.totalCents)}
      </span>
      {quote.promoActive && (
        <>
          <s className="text-sm text-muted tabular" aria-label={`Preço anterior ${formatMoney(quote.listTotalCents)}`}>
            {formatMoney(quote.listTotalCents)}
          </s>
          <span className="rounded-[var(--radius-xs)] bg-amber px-1.5 py-px text-xs font-bold text-pine-900 tabular">
            {quote.percentOff}% OFF
          </span>
        </>
      )}
    </div>
  );
}
