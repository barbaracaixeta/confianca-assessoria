import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/store/product-card";
import { getActiveCategories, getProductsByCategory } from "@/lib/catalog/queries";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 300;

export async function generateStaticParams() {
  const categories = await getActiveCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/categoria/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getActiveCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: "Categoria não encontrada" };
  return {
    title: category.name,
    description: category.description ?? undefined,
    alternates: { canonical: absoluteUrl(`/categoria/${category.slug}`) },
  };
}

export default async function CategoryPage({ params }: PageProps<"/categoria/[slug]">) {
  const { slug } = await params;
  const [categories, products] = await Promise.all([getActiveCategories(), getProductsByCategory(slug)]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-12 pb-24 md:px-8 md:pt-16">
      <nav aria-label="Trilha de navegação" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:text-pine">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/loja" className="hover:text-pine">Loja</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{category.name}</li>
        </ol>
      </nav>

      <div className="mt-6 max-w-2xl">
        <h1 className="display text-[2.75rem] text-pine md:text-[3.75rem]">{category.name}</h1>
        {category.description && <p className="mt-4 text-lg leading-relaxed text-ink-2">{category.description}</p>}
      </div>

      <p className="mt-10 border-y border-line py-4 text-sm text-muted">
        {products.length} {products.length === 1 ? "produto" : "produtos"} nesta categoria
      </p>

      {products.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="mt-6 border-y border-line py-16 text-center">
          <p className="text-2xl text-ink">Nenhum produto por aqui ainda</p>
          <p className="mx-auto mt-2 max-w-sm text-muted">Volte em breve ou explore as outras categorias da loja.</p>
          <Link href="/loja" className="link-underline mt-5 inline-block text-sm font-medium text-pine">
            Ver todos os produtos
          </Link>
        </div>
      )}
    </div>
  );
}