import type { Metadata } from "next";
import { FaqList } from "@/components/store/faq-list";
import { getActiveFaqs } from "@/lib/catalog/queries";
import { absoluteUrl, jsonLdScript } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description: "Dúvidas sobre produtos, pagamento, download, devolução e acompanhamento dos pedidos.",
  alternates: { canonical: absoluteUrl("/faq") },
};

const CATEGORY_LABEL: Record<string, string> = {
  geral: "Sobre a Confiança",
  pedidos: "Pedidos e downloads",
  pagamento: "Pagamento",
  seguranca: "Segurança e privacidade",
};

export default async function FaqPage() {
  const faqs = await getActiveFaqs();
  const groups = [...new Set(faqs.map((f) => f.category))];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <div className="mx-auto max-w-[1240px] px-5 pt-12 pb-24 md:px-8 md:pt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <h1 className="display text-[3rem] text-pine md:text-[4.25rem]">Perguntas frequentes</h1>
      <div className="mt-14 space-y-14">
        {groups.map((g) => (
          <section key={g} className="grid gap-6 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,1fr)] lg:gap-16">
            <h2 className="font-serif text-2xl text-ink">{CATEGORY_LABEL[g] ?? g}</h2>
            <FaqList items={faqs.filter((f) => f.category === g)} />
          </section>
        ))}
      </div>
    </div>
  );
}
