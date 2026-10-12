import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { FaqList } from "@/components/store/faq-list";
import { getActiveCategories, getActiveFaqs, getActiveProducts, getActiveTestimonials } from "@/lib/catalog/queries";
import { getHomeSettings } from "@/lib/settings";
import { quoteProduct } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const revalidate = 300;

export default async function HomePage() {
  const [products, faqs, testimonials, categories, home] = await Promise.all([
    getActiveProducts(),
    getActiveFaqs(),
    getActiveTestimonials(),
    getActiveCategories(),
    getHomeSettings(),
  ]);

  const heroTitle = home.heroTitle || "Materiais acadêmicos para facilitar sua jornada.";
  const heroSubtitle =
    home.heroSubtitle ||
    "Modelos, templates, guias e recursos acadêmicos desenvolvidos para ajudar você a estudar, organizar e apresentar seus trabalhos com mais segurança.";
  const heroCtaLabel = home.heroCtaLabel || "Explorar produtos";
  const heroCtaHref = home.heroCtaHref.startsWith("/") ? home.heroCtaHref : "/loja";

  const featured = products.filter((p) => p.isFeatured);
  const onSale = products.filter((p) => quoteProduct(p).promoActive);
  const bestSellers = products.filter((p) => p.isBestSeller);
  const showcase = featured.length >= 4 ? featured : products.slice(0, 4);

  return (
    <>
      {/* Hero comercial */}
      <section className="mx-auto max-w-[1240px] px-5 pt-10 pb-16 md:px-8 md:pt-16 md:pb-20">
        <div className="grid gap-10 rounded-[var(--radius-md)] border border-line bg-sheet px-6 pt-10 pb-8 md:px-12 md:pt-14 md:pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-14">
          <div className="max-w-[36rem] self-center">
            <h1 className="display mt-6 text-[2.6rem] text-pine sm:text-[3.4rem] lg:text-[3.9rem]">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-[30rem] text-lg leading-relaxed text-ink-2">
              {heroSubtitle}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <ButtonLink href={heroCtaHref} size="lg">
                {heroCtaLabel}
              </ButtonLink>
              {onSale.length > 0 && (
                <Link href="/loja?ofertas=1" className="link-underline text-[0.9375rem] font-medium text-pine">
                  Ver ofertas
                </Link>
              )}
            </div>
            <p className="mt-10 flex max-w-[30rem] flex-wrap gap-x-8 gap-y-3 border-t border-line pt-6 text-sm text-muted">
              <span className="inline-flex items-center gap-2">
                <svg viewBox="0 0 16 16" className="size-4 text-green" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M3 8.5 6.5 12 13 4.5" />
                </svg>
                Entrega imediata
              </span>
              <span className="inline-flex items-center gap-2">
                <svg viewBox="0 0 16 16" className="size-4 text-green" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M3 8.5 6.5 12 13 4.5" />
                </svg>
                Pix ou cartão
              </span>
              <span className="inline-flex items-center gap-2">
                <svg viewBox="0 0 16 16" className="size-4 text-green" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M3 8.5 6.5 12 13 4.5" />
                </svg>
                Download ilimitado
              </span>
            </p>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Categorias */}
      {categories.length > 0 && (
        <section aria-labelledby="categorias-titulo" className="mx-auto max-w-[1240px] px-5 pb-20 md:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 id="categorias-titulo" className="text-[1.75rem] text-ink md:text-[2.25rem]">
              Explore por categoria
            </h2>
            <Link href="/loja" className="link-underline text-sm font-medium text-pine">
              Ver tudo
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/categoria/${c.slug}`}
                  className="group flex h-full flex-col justify-between gap-6 rounded-[var(--radius-md)] border border-line bg-sheet p-4 transition-colors hover:border-pine/40"
                >
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-[var(--radius-xs)] font-serif text-lg",
                      i % 3 === 0 ? "bg-pine text-paper" : i % 3 === 1 ? "bg-green-50 text-pine" : "bg-amber-50 text-amber-ink",
                    )}
                    aria-hidden="true"
                  >
                    {c.name.slice(0, 1)}
                  </span>
                  <span className="font-medium text-ink group-hover:text-pine">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Produtos em destaque */}
      <section aria-labelledby="destaques-titulo" className="mx-auto max-w-[1240px] px-5 pb-20 md:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="destaques-titulo" className="text-[1.75rem] text-ink md:text-[2.5rem]">
              Produtos em destaque
            </h2>
            <p className="mt-2 max-w-md text-muted">Modelos e materiais prontos para você usar a partir de agora.</p>
          </div>
          <Link href="/loja" className="link-underline hidden text-sm font-medium text-pine sm:block">
            Ver todos
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {showcase.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Mais vendidos */}
      {bestSellers.length > 0 && (
        <section aria-labelledby="mais-vendidos-titulo" className="mx-auto max-w-[1240px] px-5 py-20 md:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 id="mais-vendidos-titulo" className="text-[1.75rem] text-ink md:text-[2.5rem]">
              Os mais escolhidos
            </h2>
            <Link href="/loja?mais-vendidos=1" className="link-underline text-sm font-medium text-pine">
              Ver todos
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bestSellers.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Como funciona */}
      <section aria-labelledby="como-funciona-titulo" className="border-y border-line bg-sheet">
        <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8">
          <h2 id="como-funciona-titulo" className="text-[1.75rem] text-ink md:text-[2.5rem]">
            Encontre · Escolha · Compre · Receba
          </h2>
          <p className="mt-3 max-w-xl text-muted">
            Todo o processo acontece na hora: sem conversas, sem esperar aprovação.
          </p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Encontre", "Explore a loja por categoria, busca ou oferta e compare modelos, guias e templates."],
              ["02", "Escolha", "Veja o preço, o formato e o que está incluído em cada produto antes de comprar."],
              ["03", "Compre", "Pague com Pix ou cartão de crédito. Cupons de desconto são aceitos no checkout."],
              ["04", "Receba", "Assim que o pagamento confirmar, o produto é liberado na sua conta para download."],
            ].map(([n, title, body]) => (
              <li key={n} className="border-t-2 border-pine pt-5">
                <span className="font-serif text-sm text-amber-ink tabular">{n}</span>
                <h3 className="mt-2 font-serif text-xl text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Depoimentos (somente se cadastrados pelo admin) */}
      {testimonials.length > 0 && (
        <section aria-labelledby="depoimentos-titulo" className="mx-auto max-w-[1240px] px-5 py-20 md:px-8">
          <h2 id="depoimentos-titulo" className="text-[2rem] text-ink">Quem já comprou</h2>
          <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {testimonials.map((t) => (
              <figure key={t.id} className="border-t border-line pt-6">
                <blockquote className="font-serif text-lg leading-relaxed text-ink-2">{t.body}</blockquote>
                <figcaption className="mt-4 text-sm text-muted">
                  <span className="font-medium text-ink">{t.authorName}</span>
                  {t.authorDetail && <>, {t.authorDetail}</>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section aria-labelledby="faq-titulo" className="border-t border-line bg-sheet">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 md:px-8 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h2 id="faq-titulo" className="text-[2rem] leading-[1.1] text-ink">Antes de comprar</h2>
            <Link href="/faq" className="link-underline mt-5 inline-block text-sm font-medium text-pine">
              Todas as perguntas
            </Link>
          </div>
          <FaqList items={faqs.slice(0, 5)} />
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 lg:py-24">
        <div className="flex flex-col gap-8 border-t-2 border-pine pt-10 md:flex-row md:items-end md:justify-between">
          <p className="max-w-[24ch] font-serif text-[2rem] leading-tight text-ink md:text-[2.5rem]">
            Comece pelo material que a sua etapa pede.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/loja" variant="accent" size="lg">
              Explorar produtos
            </ButtonLink>
            <ButtonLink href="/como-funciona" variant="outline" size="lg">
              Como funciona
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

/** Composição editorial sem imagens genéricas: página de documento + arquivos. */
function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-[26rem] lg:mr-0" aria-hidden="true">
      <div className="absolute top-0 right-0 h-[55%] w-[46%] rotate-[3deg] rounded-[var(--radius-sm)] border border-line bg-sheet p-5 shadow-[0_18px_40px_-24px_rgb(11_81_57/0.4)]">
        <div className="space-y-2">
          <div className="h-1.5 w-1/2 rounded-full bg-amber" />
          <div className="h-2 w-full rounded-sm bg-ink/25" />
          <div className="h-2 w-11/12 rounded-sm bg-ink/20" />
          <div className="h-2 w-4/5 rounded-sm bg-ink/15" />
          <div className="mt-3 space-y-1">
            <div className="h-px w-full bg-line" />
            <div className="h-px w-2/3 bg-line" />
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="inline-flex h-8 w-14 items-center justify-center rounded-[var(--radius-xs)] bg-green-50 text-[10px] font-bold text-pine">DOCX</span>
            <span className="text-xs font-bold text-amber-ink tabular">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(99.9)}</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-[52%] -rotate-2 rounded-[var(--radius-sm)] border border-line bg-sheet p-6 shadow-[0_24px_56px_-28px_rgb(31_41_51/0.4)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-green">Kit Acadêmico</span>
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] bg-amber px-1.5 py-px text-[10px] font-bold text-pine-900 tabular">25% OFF</span>
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="h-2 w-full rounded-sm bg-ink/25" />
          <div className="h-2 w-5/6 rounded-sm bg-ink/20" />
          <div className="h-2 w-3/4 rounded-sm bg-ink/15" />
          <div className="mt-4 space-y-1">
            <div className="h-px w-full bg-line" />
            <div className="h-px w-full bg-line" />
            <div className="h-px w-2/3 bg-line" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
          <svg viewBox="0 0 24 24" className="size-9 rounded-[var(--radius-xs)] bg-pine p-1.5 text-paper" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z" />
            <path d="M9 7V6a3 3 0 0 1 6 0v1" />
          </svg>
          <div>
            <p className="text-xs font-medium text-ink">Entrega imediata</p>
            <p className="text-[11px] text-muted">Pix ou cartão · Download ilimitado</p>
          </div>
        </div>
      </div>
    </div>
  );
}