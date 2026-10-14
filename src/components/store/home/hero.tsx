import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";

const TRUST = ["Compra segura", "Acesso digital", "Arquivos protegidos"];

/**
 * Herói editorial em full-bleed: a imagem educacional cobre toda a seção e o
 * discurso é sobreposto à esquerda, com um véu claro para garantir leitura.
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
    <section className="relative overflow-hidden border-b border-line bg-green-50">
      <Image
        src="/hero/hero-full.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/10"
      />

      <div className="relative mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-28 lg:py-36">
        <div className="max-w-[38rem]">
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

          <ul className="mt-12 flex max-w-[34rem] flex-wrap gap-x-7 gap-y-3 border-t border-ink/10 pt-6 text-sm text-ink-2">
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
      </div>
    </section>
  );
}
