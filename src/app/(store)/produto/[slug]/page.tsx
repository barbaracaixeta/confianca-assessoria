import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCover } from "@/components/store/product-cover";
import { ProductCard } from "@/components/store/product-card";
import { ProductPurchasePanel } from "@/components/store/product-purchase-panel";
import { FaqList } from "@/components/store/faq-list";
import { getActiveProducts, getProductBySlug } from "@/lib/catalog/queries";
import { absoluteUrl, breadcrumbJsonLd, jsonLdScript, productJsonLd } from "@/lib/seo";
import type { Product } from "@/types/domain";

export const revalidate = 300;

export async function generateStaticParams() {
  const { getActiveProducts } = await import("@/lib/catalog/queries");
  const products = await getActiveProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  const title = product.seoTitle ?? product.name;
  const description = product.seoDescription ?? product.shortDescription;
  const url = absoluteUrl(`/produto/${product.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images: product.imageUrl ? [product.imageUrl] : undefined },
    twitter: { card: "summary_large_image", title, description },
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line pt-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10">
      <h2 className="font-serif text-xl text-ink">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function uniqueById(list: Product[]): Product[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export default async function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const crumbs = [
    { name: "Início", path: "/" },
    { name: "Loja", path: "/loja" },
    ...(product.institutionName && product.institutionSlug
      ? [{ name: product.institutionName, path: `/instituicoes/${product.institutionSlug}` }]
      : []),
    ...(product.categoryName && product.categoryId
      ? [{ name: product.categoryName, path: `/loja?categoria=${product.categoryId}` }]
      : []),
    { name: product.name, path: `/produto/${product.slug}` },
  ];

  const formats = [...new Set(product.files.map((f) => f.originalName.split(".").pop()?.toUpperCase()).filter(Boolean))];

  const allProducts = await getActiveProducts();
  const others = allProducts.filter((p) => p.id !== product.id);
  const sameInstitution = product.institutionId
    ? others.filter((p) => p.institutionId === product.institutionId)
    : [];
  const sameCategory = product.categoryId ? others.filter((p) => p.categoryId === product.categoryId) : [];
  const related = uniqueById([...sameInstitution, ...sameCategory, ...others.filter((p) => p.isFeatured)]).slice(0, 4);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(crumbs)) }} />

      <div className="mx-auto max-w-[1280px] px-5 pt-8 pb-24 md:px-8 md:pt-10">
        <nav aria-label="Trilha de navegação" className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/loja" className="hover:text-pine">Loja</Link></li>
            {product.institutionName && product.institutionSlug && (
              <>
                <li aria-hidden="true">/</li>
                <li><Link href={`/instituicoes/${product.institutionSlug}`} className="hover:text-pine">{product.institutionName}</Link></li>
              </>
            )}
            {product.categoryName && (
              <>
                <li aria-hidden="true">/</li>
                <li>{product.categoryName}</li>
              </>
            )}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="max-w-[200px] truncate text-ink-2">{product.name}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_400px] lg:gap-16">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] border border-line bg-green-50">
              <ProductCover product={product} />
            </div>

            <div className="mt-8 lg:hidden">
              <ProductPurchasePanel product={product} />
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-2">
              {product.categoryName && product.categoryId && (
                <Link href={`/loja?categoria=${product.categoryId}`} className="rounded-[var(--radius-xs)] border border-line bg-sheet px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-pine/40 hover:text-pine">
                  {product.categoryName}
                </Link>
              )}
              {product.institutionName && product.institutionSlug && (
                <Link href={`/instituicoes/${product.institutionSlug}`} className="rounded-[var(--radius-xs)] border border-line bg-sheet px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-pine/40 hover:text-pine">
                  {product.institutionName}
                </Link>
              )}
            </div>
            <h1 className="display mt-4 text-[2.4rem] leading-[1.05] text-pine md:text-[3.25rem]">{product.name}</h1>
            <p className="mt-5 max-w-[40rem] text-lg leading-relaxed text-ink-2">{product.shortDescription}</p>

            <div className="prose-academic mt-8">
              {product.description.split(/\n{2,}/).map((para) => (
                <p key={para.slice(0, 32)}>{para}</p>
              ))}
            </div>

            <div className="mt-14 space-y-10">
              {product.includes.length > 0 && (
                <Section title="O que está incluído">
                  <ul className="grid gap-x-8 gap-y-2.5 text-ink-2 sm:grid-cols-2">
                    {product.includes.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0 text-green" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M3 8.5 6.5 12 13 4.5" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {product.benefits.length > 0 && (
                <Section title="O que você ganha">
                  <ul className="space-y-3">
                    {product.benefits.map((b) => (
                      <li key={b} className="font-serif text-lg leading-snug text-ink">{b}</li>
                    ))}
                  </ul>
                </Section>
              )}

              {product.faqs.length > 0 && (
                <Section title="Perguntas sobre este produto">
                  <FaqList items={product.faqs} />
                </Section>
              )}

              <Section title="Entrega digital">
                <p className="max-w-[60ch] leading-relaxed text-muted">
                  Assim que o pagamento for confirmado, o produto fica liberado automaticamente na sua conta, em
                  <Link href="/minha-conta/produtos" className="mx-1 font-medium text-pine hover:underline">Meus produtos</Link>,
                  pronto para download.{formats.length > 0 && ` Formatos: ${formats.join(", ")}.`} Você pode baixar quantas vezes precisar.
                </p>
              </Section>

              <Section title="Uso responsável">
                <p className="max-w-[60ch] leading-relaxed text-muted">
                  Os materiais são modelos, guias e recursos de apoio. Use-os como referência para estruturar e escrever o
                  seu próprio trabalho, preservando a sua autoria e as boas práticas acadêmicas.
                </p>
              </Section>
            </div>
          </div>

          <aside className="hidden lg:block" aria-label="Comprar este produto">
            <div className="sticky top-28">
              <ProductPurchasePanel product={product} />
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="relacionados-titulo" className="mt-24 border-t border-line pt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-green">{product.institutionName ?? product.categoryName ?? "Relacionados"}</p>
                <h2 id="relacionados-titulo" className="mt-3 text-[1.75rem] text-ink md:text-[2.1rem]">
                  {product.institutionName ? `Mais materiais para ${product.institutionName}` : "Produtos relacionados"}
                </h2>
              </div>
              <Link href="/loja" className="link-underline hidden text-sm font-medium text-pine sm:block">
                Ver a loja
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}