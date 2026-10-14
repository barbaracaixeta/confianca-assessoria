import Image from "next/image";
import Link from "next/link";
import { SectionHeader } from "@/components/store/section-header";
import type { InstitutionSummary } from "@/types/domain";

/**
 * Instituições reais cadastradas, com a contagem de materiais vinculados.
 * Sem logos cadastrados, mostramos o wordmark da instituição — nada é inventado.
 */
export function InstitutionExplorer({ institutions }: { institutions: InstitutionSummary[] }) {
  if (institutions.length === 0) return null;

  return (
    <section aria-labelledby="instituicoes-titulo" className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-28">
      <SectionHeader
        id="instituicoes-titulo"
        eyebrow="Da sua instituição"
        title="Encontre materiais por instituição"
        description="Escolha sua instituição de ensino e veja os materiais relacionados ao modelo de trabalho que ela exige."
        href="/instituicoes"
        linkLabel="Ver todas"
      />

      <ul className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {institutions.map((i) => (
          <li key={i.id} className="bg-sheet">
            <Link
              href={`/instituicoes/${i.slug}`}
              className="group flex h-full flex-col justify-between gap-6 p-6 transition-colors hover:bg-green-50"
            >
              <span className="flex min-h-12 items-center">
                {i.logoUrl ? (
                  <span className="relative h-12 w-full max-w-[9rem]">
                    <Image src={i.logoUrl} alt={i.name} fill sizes="144px" className="object-contain object-left" />
                  </span>
                ) : (
                  <span className="font-display font-bold text-[1.35rem] leading-none text-pine transition-colors group-hover:text-green">
                    {i.name}
                  </span>
                )}
              </span>
              <span className="inline-flex items-center gap-2 text-xs text-muted tabular">
                {i.productCount} {i.productCount === 1 ? "material" : "materiais"}
                <svg viewBox="0 0 20 20" className="size-3.5 text-green opacity-0 transition-opacity group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
