import type { Metadata } from "next";
import { Suspense } from "react";
import { StoreListing } from "@/components/store/store-listing";
import { Skeleton } from "@/components/ui/feedback";
import { getActiveCategories, getActiveProducts } from "@/lib/catalog/queries";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Loja",
  description: "Modelos, templates, guias e e-books acadêmicos prontos para baixar: TCC, ABNT, artigos, apresentações e muito mais.",
  alternates: { canonical: absoluteUrl("/loja") },
};

export default async function StorePage() {
  const [products, categories] = await Promise.all([getActiveProducts(), getActiveCategories()]);
  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-12 pb-24 md:px-8 md:pt-16">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-green">Loja</p>
          <h1 className="display mt-2 text-[2.75rem] text-pine md:text-[4rem]">Materiais para a sua jornada acadêmica</h1>
        </div>
        <p className="max-w-sm text-base leading-relaxed text-ink-2">
          Modelos, guias, templates e e-books prontos para baixar. Compre, pague com Pix ou cartão e receba na hora.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="mt-8 h-80 w-full" />}>
        <StoreListing products={products} categories={categories} />
      </Suspense>
    </div>
  );
}