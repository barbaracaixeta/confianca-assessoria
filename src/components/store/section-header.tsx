import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho de seção editorial: sobrancelha, título, descrição opcional e um
 * link para o índice completo. Mantém o mesmo ritmo em todas as seções.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "Ver todos",
  id,
  tone = "green",
  titleClassName,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  id?: string;
  tone?: "green" | "amber";
  titleClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        <p className={cn("eyebrow", tone === "amber" ? "text-amber-ink" : "text-green")}>{eyebrow}</p>
        <h2 id={id} className={cn("mt-3 text-[2.4rem] leading-[1.08] text-ink md:text-[3rem]", titleClassName)}>
          {title}
        </h2>
        {description && <p className="mt-4 max-w-xl leading-relaxed text-ink-2">{description}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-pine"
        >
          <span className="link-underline">{linkLabel}</span>
          <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-300 ease-[var(--ease-out-quart)] group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" />
          </svg>
        </Link>
      )}
    </div>
  );
}
