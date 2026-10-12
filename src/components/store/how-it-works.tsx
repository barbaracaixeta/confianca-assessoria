const STEPS = [
  { title: "Encontre o produto", body: "Explore por categoria, busca ou oferta. Veja o que está incluído e o formato em cada página." },
  { title: "Pague com Pix ou cartão", body: "A confirmação chega automaticamente. Use o cupom de desconto no resumo do pedido, se tiver." },
  { title: "Receba na hora", body: "Assim que o pagamento confirma, o produto é liberado na sua conta para download." },
  { title: "Baixe quando quiser", body: "Acesso pelo menu Minha conta em Meus produtos, quantas vezes precisar." },
];

/** Etapas reais e sequenciais — por isso numeradas. */
export function HowItWorks({ withHeading = true }: { withHeading?: boolean }) {
  return (
    <section aria-labelledby={withHeading ? "como-funciona-titulo" : undefined} className="mx-auto max-w-[1240px] px-5 py-24 md:px-8">
      {withHeading && (
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 id="como-funciona-titulo" className="text-[2.25rem] leading-[1.1] text-ink md:text-[2.75rem]">
            Como funciona
          </h2>
          <p className="max-w-sm text-muted">Quatro passos, sem cadastro obrigatório antes da compra.</p>
        </div>
      )}
      <ol className="mt-12 grid gap-10 md:grid-cols-4 md:gap-8">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative border-t border-ink/80 pt-5">
            <span className="absolute -top-[5px] left-0 size-[9px] rounded-full bg-amber" aria-hidden="true" />
            <span className="font-serif text-sm text-muted tabular">Passo {i + 1}</span>
            <h3 className="mt-2 font-serif text-xl text-ink">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}