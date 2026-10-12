import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getActiveInstitutions } from "@/lib/catalog/queries";
import { absoluteUrl, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Instituições",
  description: "Encontre modelos, guias e e-books organizados pela sua instituição de ensino, com acesso digital imediato após a compra.",
  alternates: { canonical: absoluteUrl("/instituicoes") },
};

function Monogram({ name, url }: { name: string; url: string | null }) {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-line bg-paper">
      {url ? (
        <Image src={url} alt={name} width={56} height={56} className="h-full w-full object-contain p-1.5" />
      ) : (
        <span aria-hidden="true" className="font-serif text-2xl text-pine">{name.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}

export default async function InstitutionsPage() {
  const institutions = await getActiveInstitutions();

  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-12 pb-24 md:px-8 md:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd([
            { name: "Início", path: "/" },
            { name: "Instituições", path: "/instituicoes" },
          ])),
        }}
      />

      <nav aria-label="Trilha de navegação" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:text-pine">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Instituições</li>
        </ol>
      </nav>

      <div className="mt-6 max-w-2xl">
        <p className="text-sm font-medium text-green">Instituições de ensino</p>
        <h1 className="display mt-2 text-[2.75rem] text-pine md:text-[3.75rem]">Encontre materiais da sua instituição</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-2">
          Organize a busca pelos materiais mais próximos da sua rotina acadêmica. Escolha a instituição e veja os produtos disponíveis.
        </p>
      </div>

      {institutions.length > 0 ? (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutions.map((i) => (
            <Link
              key={i.id}
              href={`/instituicoes/${i.slug}`}
              className="group flex items-center gap-4 rounded-[var(--radius-sm)] border border-line bg-sheet p-5 transition-colors hover:border-pine/40"
            >
              <Monogram name={i.name} url={i.logoUrl} />
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-xl text-ink transition-colors group-hover:text-pine">{i.name}</h2>
                <p className="text-xs text-muted tabular">
                  {i.productCount} {i.productCount === 1 ? "material" : "materiais"}
                </p>
                {i.description && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{i.description}</p>}
              </div>
              <span aria-hidden="true" className="text-muted transition-colors group-hover:text-pine">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-10 border-y border-line py-16 text-center">
          <p className="text-2xl text-ink">Nenhuma instituição cadastrada ainda</p>
          <p className="mx-auto mt-2 max-w-sm text-muted">Assim que as instituições forem cadastradas no painel, elas aparecem aqui.</p>
          <Link href="/loja" className="link-underline mt-5 inline-block text-sm font-medium text-pine">
            Ver todos os produtos
          </Link>
        </div>
      )}
    </div>
  );
}
