import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Sobre nós",
  description: "A Confiança cria materiais acadêmicos — modelos, templates, guias e recursos — para apoiar estudantes em todas as etapas da vida acadêmica.",
  alternates: { canonical: absoluteUrl("/sobre") },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-12 pb-24 md:px-8 md:pt-16">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-20">
        <h1 className="display text-[3rem] text-pine md:text-[4.25rem]">Recursos para estudar com mais segurança.</h1>
        <div className="prose-academic lg:pt-4">
          <p>
            A Confiança nasceu para apoiar estudantes em uma das etapas mais exigentes da vida acadêmica: transformar uma
            pesquisa em texto claro, bem fundamentado e dentro das normas.
          </p>
          <p>
            Hoje disponibilizamos materiais prontos para uso: modelos e templates, guias de formatação, checklists e e-books
            que economizam horas de trabalho e ajudam você a estruturar o seu próprio projeto. O conteúdo, as ideias e a
            autoria permanecem com quem escreve.
          </p>
          <p>
            Acreditamos que bons trabalhos acadêmicos nascem de método. Por isso cada material é organizado por etapa,
            navegável por categoria e entregue de forma imediata, assim que o pagamento confirma.
          </p>
        </div>
      </div>
      <dl className="mt-20 grid gap-x-12 gap-y-10 border-t border-ink/80 pt-10 md:grid-cols-3">
        {[
          ["Método", "Cada material parte do objetivo de pesquisa e das exigências mais comuns das instituições."],
          ["Transparência", "Preço, formato e o que está incluído definidos antes da compra, com entrega imediata."],
          ["Responsabilidade", "Disponibilizamos modelos e guias de apoio ao desenvolvimento, nunca a substituição do estudante."],
        ].map(([t, d]) => (
          <div key={t}>
            <dt className="font-display font-bold text-2xl text-ink">{t}</dt>
            <dd className="mt-3 leading-relaxed text-muted">{d}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-16"><ButtonLink href="/loja" size="lg">Explorar produtos</ButtonLink></div>
    </div>
  );
}