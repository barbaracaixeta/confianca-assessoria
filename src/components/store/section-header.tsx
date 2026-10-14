import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho de seção editorial: sobrancelha, título e, opcionalmente, um link
 * para o índice completo. Mantém o mesmo ritmo em todas as seções da loja.
 */
export function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel = "Ver tudo",
  id,
  tone = "green",
  titleClassName,
  className,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
  id?: string;
  tone?: "green" | "amber";
  titleClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        <p className={cn("eyebrow", tone === "amber" ? "text-amber-ink" : "text-green")}>{eyebrow}</p>
        <h2 id={id} className={cn("mt-3 text-[2.28rem] text-ink md:text-[2.88rem]", titleClassName)}>
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href} className="link-underline hidden shrink-0 text-sm font-medium text-pine sm:block">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
