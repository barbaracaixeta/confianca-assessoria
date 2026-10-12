import type { MetadataRoute } from "next";
import { getActiveCategories, getActiveProducts } from "@/lib/catalog/queries";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getActiveProducts(), getActiveCategories()]);
  const staticPages: MetadataRoute.Sitemap = ["/", "/loja", "/como-funciona", "/sobre", "/faq", "/contato"].map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
  return [
    ...staticPages,
    ...categories.map((c) => ({ url: absoluteUrl(`/categoria/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: absoluteUrl(`/produto/${p.slug}`), changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}