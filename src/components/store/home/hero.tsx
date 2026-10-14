import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";

const TRUST = ["Compra segura", "Acesso digital", "Arquivos protegidos"];

/**
 * Herói editorial. A arte da direita é a imagem de capa da marca; à esquerda, o
 * discurso e a chamada para a ação.
 */
export function Hero({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_92%_-15%,var(--color-green-100)_0%,transparent_58%)]"
      />
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-14 px-5 pt-16 pb-20 md:px-8 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:gap-20 lg:pt-24 lg:pb-28">
        <div className="reveal max-w-[38rem]">
          <p className="eyebrow text-green">Materiais acadêmicos digitais</p>
          <h1 className="display mt-5 text-[2.6rem] text-pine sm:text-[3.3rem] lg:text-[4rem]">{title}</h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-2">{subtitle}</p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <ButtonLink href={ctaHref} size="lg">
              {ctaLabel}
            </ButtonLink>
            <ButtonLink href="/loja?mais-vendidos=1" variant="outline" size="lg">
              Ver mais vendidos
            </ButtonLink>
          </div>

          <ul className="mt-12 flex max-w-[34rem] flex-wrap gap-x-7 gap-y-3 border-t border-line pt-6 text-sm text-muted">
            {TRUST.map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <svg viewBox="0 0 16 16" className="size-4 text-green" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path d="M3 8.5 6.5 12 13 4.5" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[34rem] lg:mr-0">
          <Image
            src="/hero/hero-img-2.webp"
            alt="Materiais acadêmicos digitais Confiança"
            width={1600}
            height={893}
            priority
            className="h-auto w-full rounded-[var(--radius-md)] border border-line shadow-md"
          />
        </div>
      </div>
    </section>
  );
}
