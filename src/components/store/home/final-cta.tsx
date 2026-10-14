import { ButtonLink } from "@/components/ui/button";

/** Fecho comercial: bloco verde profundo com o convite ao catálogo. */
export function FinalCta() {
  return (
    <section aria-labelledby="cta-final-titulo" className="bg-pine text-paper">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-5 py-20 md:flex-row md:items-center md:justify-between md:gap-12 md:px-8 md:py-24">
        <div>
          <h2 id="cta-final-titulo" className="max-w-[20ch] text-[2.4rem] leading-[1.1] text-paper md:text-[3.1rem]">
            Encontre o material que você precisa.
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-paper/75">
            Explore o catálogo da Confiança e avance com mais segurança na sua jornada acadêmica.
          </p>
        </div>
        <ButtonLink href="/loja" variant="accent" size="lg" className="shrink-0">
          Explorar loja
        </ButtonLink>
      </div>
    </section>
  );
}
