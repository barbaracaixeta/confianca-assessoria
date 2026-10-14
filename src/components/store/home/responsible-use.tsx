/** Nota editorial sobre uso responsável. Discreta, sem tom de aviso jurídico. */
export function ResponsibleUse() {
  return (
    <section aria-labelledby="uso-responsavel-titulo" className="mx-auto max-w-[1280px] px-5 py-16 md:px-8 md:py-20">
      <div className="grid gap-6 border-t-2 border-pine pt-8 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-12">
        <h2 id="uso-responsavel-titulo" className="text-[1.5rem] text-ink">
          Materiais para apoiar, não substituir.
        </h2>
        <p className="max-w-[64ch] leading-relaxed text-muted">
          Os materiais da Confiança foram desenvolvidos como recursos de apoio à sua jornada acadêmica. Utilize os conteúdos
          como referência, adaptação e aprendizado, sempre respeitando as orientações da sua instituição e a autoria acadêmica.
        </p>
      </div>
    </section>
  );
}
