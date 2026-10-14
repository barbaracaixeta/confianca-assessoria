import { cn } from "@/lib/utils";

type Tone = "discount" | "new" | "best";

const tones: Record<Tone, string> = {
  discount: "bg-amber text-pine-900",
  new: "bg-sheet/95 text-pine",
  best: "bg-pine text-paper",
};

/** Selo compacto de produto. A cor nunca é o único sinal: o rótulo sempre diz o que é. */
export function ProductBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-[var(--radius-xs)] px-2 py-1 text-[10px] font-bold tracking-[0.08em] backdrop-blur-[2px] tabular",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
