const BENEFITS: { title: string; body: string; icon: React.ReactNode }[] = [
  {
    title: "Compra segura",
    body: "Pagamento processado com segurança.",
    icon: (
      <>
        <path d="M12 4 5 7v5c0 4 3 6.5 7 8 4-1.5 7-4 7-8V7l-7-3Z" />
        <path d="M9.3 11.8 11.4 14l3.3-3.6" />
      </>
    ),
  },
  {
    title: "Acesso digital",
    body: "Seu material fica disponível após a confirmação do pagamento.",
    icon: (
      <>
        <path d="M12 3v6m0 0 3-3m-3 3L9 6" />
        <path d="M6 12a6 6 0 1 0 12 0" />
      </>
    ),
  },
  {
    title: "Arquivos protegidos",
    body: "Seus arquivos são entregues de forma segura.",
    icon: (
      <>
        <path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z" />
        <path d="M9 7V6a3 3 0 0 1 6 0v1" />
      </>
    ),
  },
  {
    title: "Tudo em um só lugar",
    body: "Acesse seus produtos pela sua conta.",
    icon: (
      <>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 19a7 7 0 0 1 14 0" />
      </>
    ),
  },
];

/** Bloco de confiança em verde profundo. Só descreve o que a compra realmente entrega. */
export function Benefits() {
  return (
    <section aria-labelledby="beneficios-titulo" className="bg-pine text-paper">
      <div className="mx-auto grid max-w-[1280px] gap-14 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div>
          <p className="eyebrow text-amber-light">Por que comprar aqui</p>
          <h2 id="beneficios-titulo" className="mt-3 text-[2.4rem] leading-[1.1] text-paper md:text-[3rem]">
            Uma experiência simples do início ao acesso.
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-paper/75">
            Do pagamento à entrega, cuidamos de cada etapa para que você receba seus materiais com segurança e possa baixá-los quando precisar.
          </p>
        </div>

        <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="border-t border-paper/20 pt-5">
              <dt className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="size-6 shrink-0 text-amber-light" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {b.icon}
                </svg>
                <span className="font-display font-bold text-[1.15rem] text-paper">{b.title}</span>
              </dt>
              <dd className="mt-3 text-sm leading-relaxed text-paper/75">{b.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
