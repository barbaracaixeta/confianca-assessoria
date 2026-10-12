import { cn } from "@/lib/utils";

/**
 * Marca PROVISÓRIA (placeholder) — livro aberto + capelo, em SVG.
 * Substituir pelo arquivo oficial da logo em /public/brand quando disponível
 * (ver README › Identidade visual). Fundo sempre transparente.
 */
export function LogoMark({ className, tone = "color" }: { className?: string; tone?: "color" | "light" }) {
  const pages = tone === "light" ? "#F8FAF8" : "#0B5139";
  const spine = tone === "light" ? "#FFB45C" : "#147A55";
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      {/* capelo */}
      <path d="M20 3.5 31 8.6 20 13.7 9 8.6Z" fill="#F28C28" />
      <path d="M28.6 9.8v4.6" stroke="#F28C28" strokeWidth="1.4" strokeLinecap="round" />
      {/* livro aberto */}
      <path d="M20 18.4c-3.9-2.6-9.2-3.3-15-2.4v17.3c5.8-.9 11.1-.2 15 2.4Z" fill={pages} />
      <path d="M20 18.4c3.9-2.6 9.2-3.3 15-2.4v17.3c-5.8-.9-11.1-.2-15 2.4Z" fill={pages} opacity="0.86" />
      <path d="M20 18.4v17.3" stroke={spine} strokeWidth="1.2" />
    </svg>
  );
}

export function Logo({
  className,
  tone = "color",
  compact = false,
}: {
  className?: string;
  tone?: "color" | "light";
  /** Somente a palavra principal (mobile e painel). */
  compact?: boolean;
}) {
  const text = tone === "light" ? "text-paper" : "text-pine";
  const sub = tone === "light" ? "text-paper/70" : "text-green";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-9 shrink-0" tone={tone} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-serif text-[1.5rem] leading-none font-normal tracking-[-0.01em]", text)}>
          Confiança
        </span>
        {!compact && (
          <span className={cn("mt-1 text-[0.62rem] font-semibold tracking-[0.2em]", sub)}>ASSESSORIA ACADÊMICA</span>
        )}
      </span>
    </span>
  );
}
