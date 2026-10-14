import Link from "next/link";
import { SectionHeader } from "@/components/store/section-header";
import type { CategorySummary } from "@/types/domain";

/**
 * Navegação por categoria em composição editorial: numeral grande, nome,
 * descrição e a contagem real de materiais. A contagem vem do banco —
 * nenhum número é inventado.
 */
export function CategoryNav({ categories }: { categories: CategorySummary[] }) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="categorias-titulo" className="bg-sheet">
      <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-28">
        <SectionHeader
          id="categorias-titulo"
          eyebrow="Explore por categoria"
          title="Encontre o material certo para o que você precisa"
          description="Do trabalho de conclusão às apresentações: escolha a categoria da sua etapa e veja os materiais disponíveis."
          href="/loja"
          linkLabel="Ver catálogo"
        />

        <ul className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <li key={c.id}>
              <Link href={`/categoria/${c.slug}`} className="group block border-t border-line pt-6">
                <span aria-hidden="true" className="block font-display font-bold text-sm text-line-strong tabular">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-[1.6rem] leading-tight text-ink transition-colors group-hover:text-pine">
                  {c.name}
                </h3>
                {c.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{c.description}</p>
                )}
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-pine">
                  <span className="link-underline">
                    {c.productCount} {c.productCount === 1 ? "material" : "materiais"}
                  </span>
                  <svg viewBox="0 0 20 20" className="size-4 transition-transform duration-300 ease-[var(--ease-out-quart)] group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
