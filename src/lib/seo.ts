import { appUrl } from "@/lib/env";
import { quoteProduct } from "@/lib/pricing";
import type { Product } from "@/types/domain";

export function absoluteUrl(path: string): string {
  return `${appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function serviceJsonLd(p: Product) {
  const q = quoteProduct(p);
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: p.name,
    description: p.seoDescription ?? p.shortDescription,
    serviceType: p.categoryName ?? "Assessoria acadêmica",
    url: absoluteUrl(`/produto/${p.slug}`),
    provider: { "@type": "Organization", name: "Confiança Assessoria Acadêmica", url: appUrl },
    areaServed: { "@type": "Country", name: "Brasil" },
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: (q.unitCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/produto/${p.slug}`),
    },
  };
}

/** JSON-LD de produto (schema.org Product + Offer) para as páginas da loja. */
export function productJsonLd(p: Product) {
  const q = quoteProduct(p);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.seoDescription ?? p.shortDescription,
    category: p.categoryName ?? undefined,
    url: absoluteUrl(`/produto/${p.slug}`),
    image: p.imageUrl ?? undefined,
    ...(p.sku ? { sku: p.sku } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: (q.totalCents / 100).toFixed(2),
      priceValidUntil: p.promoEndsAt ?? undefined,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      url: absoluteUrl(`/produto/${p.slug}`),
    },
  };
}

/** Serializa JSON-LD escapando "<" para impedir injeção de script. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
