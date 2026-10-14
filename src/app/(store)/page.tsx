import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/store/section-header";
import { ProductGrid } from "@/components/store/product-grid";
import { FaqList } from "@/components/store/faq-list";
import { Hero } from "@/components/store/home/hero";
import { CategoryNav } from "@/components/store/home/category-nav";
import { InstitutionExplorer } from "@/components/store/home/institution-explorer";
import { HomeBestSellers } from "@/components/store/home/best-sellers";
import { Benefits } from "@/components/store/home/benefits";
import { HomeHowItWorks } from "@/components/store/home/how-it-works";
import { HomeOffers } from "@/components/store/home/offers";
import { ResponsibleUse } from "@/components/store/home/responsible-use";
import { FinalCta } from "@/components/store/home/final-cta";
import {
  getActiveCategories,
  getActiveFaqs,
  getActiveInstitutions,
  getActiveProducts,
} from "@/lib/catalog/queries";
import { getHomeSettings } from "@/lib/settings";
import { quoteProduct } from "@/lib/pricing";
import { absoluteUrl } from "@/lib/seo";
import type { Product } from "@/types/domain";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Confiança Assessoria Acadêmica | Materiais Acadêmicos Digitais" },
  description:
    "Materiais acadêmicos digitais, templates, guias, modelos e recursos para apoiar sua jornada acadêmica. Acesso imediato após a confirmação do pagamento.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Confiança Assessoria Acadêmica",
    title: "Confiança Assessoria Acadêmica | Materiais Acadêmicos Digitais",
    description:
      "Templates, modelos, guias e recursos digitais para apoiar sua jornada acadêmica.",
    url: absoluteUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: "Confiança Assessoria Acadêmica | Materiais Acadêmicos Digitais",
    description: "Templates, modelos, guias e recursos digitais para apoiar sua jornada acadêmica.",
  },
};

export default async function HomePage() {
  const [products, faqs, categories, institutions, home] = await Promise.all([
    getActiveProducts(),
    getActiveFaqs(),
    getActiveCategories(),
    getActiveInstitutions(),
    getHomeSettings(),
  ]);

  const heroTitle = home.heroTitle || "Materiais acadêmicos para avançar com mais segurança.";
  const heroSubtitle =
    home.heroSubtitle ||
    "Templates, modelos, guias e recursos digitais para apoiar sua jornada acadêmica — com acesso imediato após a confirmação do pagamento.";
  const heroCtaLabel = home.heroCtaLabel || "Explorar materiais";
  const heroCtaHref = home.heroCtaHref.startsWith("/") ? home.heroCtaHref : "/loja";

  const featured = products.filter((p) => p.isFeatured);
  const bestSellers = products.filter((p) => p.isBestSeller);
  const onSale = products.filter((p) => quoteProduct(p).promoActive);
  const showcase = (featured.length >= 4 ? featured : products).slice(0, 8);

  return (
    <>
      <Hero title={heroTitle} subtitle={heroSubtitle} ctaLabel={heroCtaLabel} ctaHref={heroCtaHref} />

      <CategoryNav categories={categories} />

      {showcase.length > 0 ? (
        <FeaturedSection products={showcase} />
      ) : (
        products.length === 0 && <EmptyCatalog />
      )}

      <InstitutionExplorer institutions={institutions} />

      <HomeBestSellers products={bestSellers} />

      <Benefits />

      <HomeHowItWorks />

      <HomeOffers products={onSale} />

      <ResponsibleUse />

      <FaqSection faqs={faqs} />

      <FinalCta />
    </>
  );
}

function FeaturedSection({ products }: { products: Product[] }) {
  return (
    <section aria-labelledby="destaques-titulo" className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-28">
      <SectionHeader
        id="destaques-titulo"
        eyebrow="Selecionados"
        title="Selecionados para você"
        description="Materiais digitais escolhidos para facilitar sua busca."
        href="/loja"
        linkLabel="Ver todos"
      />
      <ProductGrid products={products} className="mt-12" priorityCount={4} stagger />
    </section>
  );
}

function FaqSection({ faqs }: { faqs: { question: string; answer: string }[] }) {
  if (faqs.length === 0) return null;
  return (
    <section aria-labelledby="faq-titulo" className="border-t border-line">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <p className="eyebrow text-green">Dúvidas</p>
          <h2 id="faq-titulo" className="mt-3 text-[2.4rem] leading-[1.1] text-ink md:text-[3rem]">
            Antes de comprar
          </h2>
          <p className="mt-4 max-w-xs leading-relaxed text-muted">
            As perguntas mais comuns sobre entrega, acesso e pagamento.
          </p>
          <Link href="/faq" className="link-underline mt-5 inline-block text-sm font-medium text-pine">
            Todas as perguntas
          </Link>
        </div>
        <FaqList items={faqs.slice(0, 5)} />
      </div>
    </section>
  );
}

function EmptyCatalog() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-28">
      <div className="rounded-[var(--radius-md)] border border-line bg-sheet px-6 py-16 text-center">
        <p className="font-display font-bold text-2xl text-ink">Estamos preparando o catálogo</p>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted">
          Novos materiais digitais estão a caminho. Volte em breve para conhecer os recursos disponíveis.
        </p>
      </div>
    </section>
  );
}
