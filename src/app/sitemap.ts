import type { MetadataRoute } from "next";
import { getActiveCategories, getActiveInstitutions, getActiveProducts } from "@/lib/catalog/queries";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, institutions] = await Promise.all([
    getActiveProducts(),
    getActiveCategories(),
    getActiveInstitutions(),
  ]);
  const staticPages: MetadataRoute.Sitemap = ["/", "/loja", "/instituicoes", "/como-funciona", "/sobre", "/faq", "/contato"].map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
  return [
    ...staticPages,
    ...categories.map((c) => ({ url: absoluteUrl(`/categoria/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...institutions.map((i) => ({ url: absoluteUrl(`/instituicoes/${i.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: absoluteUrl(`/produto/${p.slug}`), changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}