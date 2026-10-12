import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StoreListing } from "@/components/store/store-listing";
import { Skeleton } from "@/components/ui/feedback";
import {
  getActiveCategories,
  getActiveInstitutions,
  getInstitutionBySlug,
  getProductsByInstitution,
} from "@/lib/catalog/queries";
import { absoluteUrl, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

export const revalidate = 300;

export async function generateStaticParams() {
  const institutions = await getActiveInstitutions();
  return institutions.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: PageProps<"/instituicoes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const institution = await getInstitutionBySlug(slug);
  if (!institution) return { title: "Instituição não encontrada" };
  const title = `${institution.name} — materiais e modelos acadêmicos`;
  const description =
    institution.description ??
    `Modelos, guias, templates e e-books para estudantes da ${institution.name}. Baixe na hora após a compra.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/instituicoes/${institution.slug}`) },
    openGraph: { title, description, url: absoluteUrl(`/instituicoes/${institution.slug}`), type: "website" },
  };
}

export default async function InstitutionPage({ params }: PageProps<"/instituicoes/[slug]">) {
  const { slug } = await params;
  const [institution, categories, products] = await Promise.all([
    getInstitutionBySlug(slug),
    getActiveCategories(),
    getProductsByInstitution(slug),
  ]);
  if (!institution) notFound();

  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-12 pb-24 md:px-8 md:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd([
            { name: "Início", path: "/" },
            { name: "Instituições", path: "/instituicoes" },
            { name: institution.name, path: `/instituicoes/${institution.slug}` },
          ])),
        }}
      />

      <nav aria-label="Trilha de navegação" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:text-pine">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/instituicoes" className="hover:text-pine">Instituições</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{institution.name}</li>
        </ol>
      </nav>

      <header className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          {institution.logoUrl && (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-line bg-sheet">
              <Image src={institution.logoUrl} alt={institution.name} width={64} height={64} className="h-full w-full object-contain p-2" />
            </span>
          )}
          <div>
            <p className="text-sm font-medium text-green">Instituição</p>
            <h1 className="display mt-1 text-[3.3rem] text-pine md:text-[4.2rem]">Materiais para {institution.name}</h1>
          </div>
        </div>
        <p className="max-w-sm text-base leading-relaxed text-ink-2">
          {institution.description ??
            `Modelos, guias, templates e e-books prontos para baixar e usar nos trabalhos da ${institution.name}.`}
        </p>
      </header>

      <Suspense fallback={<Skeleton className="mt-8 h-80 w-full" />}>
        <StoreListing
          products={products}
          categories={categories}
          basePath={`/instituicoes/${institution.slug}`}
          fixedInstitutionSlug={institution.slug}
        />
      </Suspense>

      <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
        <Link href="/instituicoes" className="link-underline font-medium text-pine">Ver todas as instituições</Link>
      </p>
    </div>
  );
}
