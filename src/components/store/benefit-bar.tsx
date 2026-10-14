const BENEFITS: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    title: "Acesso imediato",
    body: "Liberado na sua conta assim que o pagamento é confirmado.",
    icon: (
      <path d="M12 3v6m0 0 3-3m-3 3L9 6M6 12a6 6 0 1 0 12 0" />
    ),
  },
  {
    title: "Pix ou cartão",
    body: "Pague como preferir, em ambiente seguro.",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
  },
  {
    title: "Download ilimitado",
    body: "Baixe quantas vezes precisar, quando precisar.",
    icon: (
      <>
        <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
        <path d="M5 18h14" />
      </>
    ),
  },
  {
    title: "Compra segura",
    body: "Pagamento registrado e histórico no seu painel.",
    icon: (
      <>
        <path d="M12 4 5 7v5c0 4 3 6.5 7 8 4-1.5 7-4 7-8V7l-7-3Z" />
        <path d="M9.3 11.8 11.4 14l3.3-3.6" />
      </>
    ),
  },
];

/** Faixa de garantias logo abaixo do herói. Reforça o que a compra já entrega. */
export function BenefitBar() {
  return (
    <section aria-label="Vantagens da loja" className="border-y border-line bg-sheet">
      <ul className="mx-auto grid max-w-[1280px] grid-cols-1 gap-px bg-line px-5 sm:grid-cols-2 lg:grid-cols-4 md:px-8">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex items-start gap-3.5 bg-sheet px-2 py-6 sm:px-6">
            <svg
              viewBox="0 0 24 24"
              className="mt-0.5 size-6 shrink-0 text-green"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {b.icon}
            </svg>
            <span>
              <span className="block font-display font-bold text-[1.05rem] leading-snug text-ink">{b.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">{b.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
