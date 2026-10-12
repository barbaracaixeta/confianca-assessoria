import type { Metadata } from "next";
import { HowItWorks } from "@/components/store/how-it-works";
import { ButtonLink } from "@/components/ui/button";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Como funciona",
  description: "Encontre um produto, pague com Pix ou cartão e baixe o material na hora pela sua conta.",
  alternates: { canonical: absoluteUrl("/como-funciona") },
};

const DETAILS = [
  ["Entrega imediata", "Assim que o pagamento é confirmado, o produto é liberado automaticamente na sua conta e você baixa na hora."],
  ["Pagamento verificado", "A confirmação do Pix ou do cartão chega direto do processador de pagamentos. Não é preciso enviar comprovante."],
  ["Downloads protegidos", "Seus arquivos ficam em armazenamento privado e só podem ser baixados por você, após a compra."],
  ["Uso responsável", "Os materiais são modelos, guias e recursos de apoio para você estruturar e escrever o seu próprio trabalho."],
];

export default function HowItWorksPage() {
  return (
    <>
      <div className="mx-auto max-w-[1280px] px-5 pt-12 md:px-8 md:pt-16">
        <h1 className="display max-w-[16ch] text-[3rem] text-pine md:text-[4.25rem]">Como funciona</h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">Encontre, escolha, compre e receba: a entrega acontece na hora, sem espera.</p>
      </div>
      <HowItWorks withHeading={false} />
      <section className="bg-sheet">
        <div className="mx-auto grid max-w-[1280px] gap-x-16 gap-y-10 px-5 py-20 md:grid-cols-2 md:px-8">
          {DETAILS.map(([t, d]) => (
            <div key={t} className="border-t border-line pt-5">
              <h2 className="text-[1.8rem] text-ink">{t}</h2>
              <p className="mt-3 max-w-[48ch] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-8">
        <ButtonLink href="/loja" size="lg">Explorar produtos</ButtonLink>
      </div>
    </>
  );
}