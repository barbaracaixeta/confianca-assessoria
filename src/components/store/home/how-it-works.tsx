const STEPS = [
  { title: "Escolha", body: "Encontre o material que procura por categoria, instituição ou busca." },
  { title: "Compre", body: "Faça o pagamento pelo checkout, com Pix ou cartão." },
  { title: "Confirmação", body: "Aguarde a confirmação automática do pagamento." },
  { title: "Acesse", body: "Encontre seu produto em Minha conta, pronto para baixar." },
];

/** Etapas reais e sequenciais — por isso numeradas e ligadas por um fio contínuo. */
export function HomeHowItWorks() {
  return (
    <section aria-labelledby="como-funciona-titulo" className="border-t border-line bg-sheet">
      <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-28">
        <p className="eyebrow text-green">Como funciona</p>
        <h2 id="como-funciona-titulo" className="mt-3 max-w-xl text-[2.4rem] leading-[1.1] text-ink md:text-[3rem]">
          Do escolher ao acessar, sem espera.
        </h2>

        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <div className="flex items-center gap-4">
                <span className="font-display font-bold text-[1.35rem] text-pine tabular">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-line" />
              </div>
              <h3 className="mt-5 text-[1.4rem] leading-tight text-ink">{s.title}</h3>
              <p className="mt-2 max-w-[28ch] leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-12 text-sm text-muted">
          Pagamento por Pix ou cartão. Cupom de desconto pode ser aplicado no resumo do pedido.
        </p>
      </div>
    </section>
  );
}
