import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/product-grid";
import { SectionHeader } from "@/components/store/section-header";
import { BenefitBar } from "@/components/store/benefit-bar";
import { FaqList } from "@/components/store/faq-list";
import { getActiveCategories, getActiveFaqs, getActiveInstitutions, getActiveProducts, getActiveTestimonials } from "@/lib/catalog/queries";
import { getHomeSettings } from "@/lib/settings";
import { quoteProduct } from "@/lib/pricing";
import { formatMoney } from "@/lib/utils";
import type { Product } from "@/types/domain";

export const revalidate = 300;

export default async function HomePage() {
  const [products, faqs, testimonials, categories, institutions, home] = await Promise.all([
    getActiveProducts(),
    getActiveFaqs(),
    getActiveTestimonials(),
    getActiveCategories(),
    getActiveInstitutions(),
    getHomeSettings(),
  ]);

  const heroTitle = home.heroTitle || "Mais confiança para cada etapa da sua jornada acadêmica.";
  const heroSubtitle =
    home.heroSubtitle ||
    "Materiais de apoio, modelos e recursos organizacionais para você estruturar melhor seus trabalhos, com acesso digital imediato após a confirmação do pagamento.";
  const heroCtaLabel = home.heroCtaLabel || "Explorar materiais";
  const heroCtaHref = home.heroCtaHref.startsWith("/") ? home.heroCtaHref : "/loja";

  const featured = products.filter((p) => p.isFeatured);
  const bestSellers = products.filter((p) => p.isBestSeller);
  const onSale = products.filter((p) => quoteProduct(p).promoActive);
  const showcase = (featured.length >= 4 ? featured : products).slice(0, 8);
  const heroProducts = products.filter((p) => p.imageUrl).slice(0, 3);

  return (
    <>
      {/* Hero editorial */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_88%_-10%,var(--color-green-100)_0%,transparent_58%)]" />
        <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-5 pt-14 pb-16 md:px-8 md:pt-20 md:pb-24 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-16">
          <div className="reveal max-w-[38rem]">
            <p className="eyebrow text-green">Materiais acadêmicos digitais</p>
            <h1 className="display mt-5 text-[2.9rem] text-pine sm:text-[3.5rem] lg:text-[4.2rem]">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-[32rem] text-lg leading-relaxed text-ink-2">{heroSubtitle}</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <ButtonLink href={heroCtaHref} size="lg">
                {heroCtaLabel}
              </ButtonLink>
              <Link href="/sobre" className="link-underline text-[0.9375rem] font-medium text-pine">
                Conhecer a Confiança
              </Link>
            </div>
            <ul className="mt-12 flex max-w-[32rem] flex-wrap gap-x-8 gap-y-3 border-t border-line pt-6 text-sm text-muted">
              {["Acesso imediato após o pagamento", "Pix ou cartão", "Download ilimitado"].map((t) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <svg viewBox="0 0 16 16" className="size-4 text-green" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d="M3 8.5 6.5 12 13 4.5" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <HeroVisual products={heroProducts} />
        </div>
      </section>

      {/* Garantias da loja */}
      <BenefitBar />

      {/* Categorias — navegação editorial com contagem real */}
      {categories.length > 0 && (
        <section aria-labelledby="categorias-titulo" className="bg-sheet">
          <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-8">
            <SectionHeader id="categorias-titulo" eyebrow="Explore por categoria" title="Encontre o material da sua etapa" href="/loja" />
            <ul className="mt-10 grid gap-x-12 sm:grid-cols-2">
              {categories.map((c, i) => (
                <li key={c.id} className="border-t border-line">
                  <Link href={`/categoria/${c.slug}`} className="group flex items-center justify-between gap-4 py-4">
                    <span className="flex items-baseline gap-4">
                      <span className="w-6 text-xs text-muted tabular">{String(i + 1).padStart(2, "0")}</span>
                      <span>
                        <span className="block font-display font-bold text-[1.5rem] text-ink transition-colors group-hover:text-pine">{c.name}</span>
                        <span className="mt-0.5 block text-xs text-muted tabular">
                          {c.productCount} {c.productCount === 1 ? "material" : "materiais"}
                        </span>
                      </span>
                    </span>
                    <svg viewBox="0 0 20 20" className="size-5 shrink-0 -translate-x-1 text-green opacity-0 transition-[opacity,transform] duration-300 ease-[var(--ease-out-quart)] group-hover:translate-x-0 group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Instituições — filtro por instituição de ensino */}
      {institutions.length > 0 && (
        <section aria-labelledby="instituicoes-titulo" className="mx-auto max-w-[1280px] px-5 py-20 md:px-8">
          <SectionHeader id="instituicoes-titulo" eyebrow="Da sua instituição" title="Encontre materiais da sua instituição" href="/instituicoes" linkLabel="Ver todas" />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {institutions.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/instituicoes/${i.slug}`}
                  className="group flex h-full flex-col justify-between gap-5 rounded-[var(--radius-sm)] border border-line bg-sheet p-5 transition-colors hover:border-pine/40"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-line bg-paper">
                      {i.logoUrl ? (
                        <Image src={i.logoUrl} alt="" width={44} height={44} className="h-full w-full object-contain p-1" />
                      ) : (
                        <span aria-hidden="true" className="font-display font-bold text-lg text-pine">{i.name.slice(0, 1).toUpperCase()}</span>
                      )}
                    </span>
                    <span className="font-display font-bold text-xl text-ink transition-colors group-hover:text-pine">{i.name}</span>
                  </span>
                  <span className="text-xs text-muted tabular">
                    {i.productCount} {i.productCount === 1 ? "material" : "materiais"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Produtos em destaque */}
      {showcase.length > 0 && (
        <section aria-labelledby="destaques-titulo" className="mx-auto max-w-[1280px] px-5 py-20 md:px-8">
          <SectionHeader id="destaques-titulo" eyebrow="Materiais em destaque" title="Prontos para usar a partir de agora" href="/loja" linkLabel="Ver todos" titleClassName="md:text-[3rem]" />
          <ProductGrid products={showcase} className="mt-10" />
        </section>
      )}

      {/* Mais vendidos — ranking */}
      {bestSellers.length > 0 && (
        <section aria-labelledby="mais-vendidos-titulo" className="border-y border-line bg-sheet">
          <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-8">
            <SectionHeader id="mais-vendidos-titulo" eyebrow="Mais procurados" title="Escolhidos por quem já confia" href="/loja?mais-vendidos=1" linkLabel="Ver todos" tone="amber" titleClassName="md:text-[3rem]" />
            <ol className="mt-10 divide-y divide-line border-t border-line">
              {bestSellers.slice(0, 5).map((p, i) => (
                <BestSellerRow key={p.id} product={p} rank={i + 1} />
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Ofertas em aberto */}
      {onSale.length > 0 && (
        <section aria-labelledby="ofertas-titulo" className="mx-auto max-w-[1280px] px-5 py-20 md:px-8">
          <SectionHeader id="ofertas-titulo" eyebrow="Por tempo limitado" title="Ofertas em aberto" href="/loja?ofertas=1" linkLabel="Ver ofertas" tone="amber" titleClassName="md:text-[3rem]" />
          <ProductGrid products={onSale.slice(0, 4)} className="mt-10" />
        </section>
      )}

      {/* Por que escolher */}
      <section aria-labelledby="beneficios-titulo" className="border-t border-line bg-sheet">
        <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-20">
            <div>
              <p className="eyebrow text-green">Por que escolher</p>
              <h2 id="beneficios-titulo" className="mt-3 text-[2.28rem] text-ink md:text-[2.88rem]">
                Uma plataforma séria para a sua jornada
              </h2>
            </div>
            <dl className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {[
                ["01", "Materiais selecionados", "Modelos, guias e templates revisados para apoiar cada etapa do trabalho acadêmico."],
                ["02", "Acesso imediato", "Assim que o pagamento é confirmado, o material fica liberado automaticamente na sua conta."],
                ["03", "Arquivos organizados", "Cada produto traz seus arquivos identificados, com formato e tamanho visíveis antes da compra."],
                ["04", "Compra segura", "Pagamento por Pix ou cartão, com liberação registrada e histórico no seu painel."],
              ].map(([n, title, body]) => (
                <div key={n} className="rule-top pt-5">
                  <dt className="flex items-baseline gap-3">
                    <span className="font-display font-bold text-sm text-amber-ink tabular">{n}</span>
                    <span className="font-display font-bold text-xl text-ink">{title}</span>
                  </dt>
                  <dd className="mt-2.5 text-sm leading-relaxed text-muted">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section aria-labelledby="como-funciona-titulo" className="border-y border-line bg-sheet">
        <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-8">
          <p className="eyebrow text-green">Como funciona</p>
          <h2 id="como-funciona-titulo" className="mt-3 max-w-xl text-[2.28rem] text-ink md:text-[2.88rem]">
            Do escolher ao baixar, sem espera
          </h2>
          <ol className="relative mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <span aria-hidden="true" className="absolute top-[1.1rem] left-0 hidden h-px w-full bg-line lg:block" />
            {[
              ["01", "Escolha seu material", "Navegue por categoria, busca ou oferta e veja o que está incluído em cada produto."],
              ["02", "Faça o pagamento", "Pague com Pix ou cartão. Cupons de desconto são aceitos no checkout."],
              ["03", "Receba o acesso", "A confirmação do pagamento libera o produto automaticamente, sem nenhuma ação manual."],
              ["04", "Baixe seus arquivos", "Acesse Meus produtos e baixe quantas vezes precisar, com links seguros."],
            ].map(([n, title, body]) => (
              <li key={n} className="relative bg-sheet lg:pr-6">
                <span className="relative z-10 inline-flex size-9 items-center justify-center rounded-full bg-pine font-display font-bold text-sm text-paper tabular">
                  {n}
                </span>
                <h3 className="mt-4 text-[1.5rem] text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Uso responsável — discreto */}
      <section aria-labelledby="uso-responsavel-titulo" className="mx-auto max-w-[1280px] px-5 py-20 md:px-8">
        <div className="rule-top grid gap-6 pt-8 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
          <h2 id="uso-responsavel-titulo" className="text-[1.5rem] text-ink">Uso responsável</h2>
          <p className="max-w-[64ch] leading-relaxed text-muted">
            A Confiança oferece materiais de apoio, modelos, guias e recursos acadêmicos. Os produtos não são trabalhos prontos
            para submissão nem garantem nota ou aprovação. Use-os como referência para estruturar e escrever o seu próprio
            trabalho, preservando a sua autoria e as boas práticas acadêmicas.
          </p>
        </div>
      </section>

      {/* Depoimentos (somente se cadastrados pelo admin) */}
      {testimonials.length > 0 && (
        <section aria-labelledby="depoimentos-titulo" className="border-y border-line bg-sheet">
          <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-8">
            <p className="eyebrow text-green">Quem já comprou</p>
            <h2 id="depoimentos-titulo" className="mt-3 text-[2.4rem] text-ink">Relatos de quem confia</h2>
            <div className="mt-10 grid gap-x-14 gap-y-10 md:grid-cols-2">
              {testimonials.map((t) => (
                <figure key={t.id} className="rule-top pt-6">
                  <blockquote className="font-display font-bold text-lg leading-relaxed text-ink-2">{t.body}</blockquote>
                  <figcaption className="mt-4 text-sm text-muted">
                    <span className="font-medium text-ink">{t.authorName}</span>
                    {t.authorDetail && <>, {t.authorDetail}</>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section aria-labelledby="faq-titulo" className="mx-auto max-w-[1280px] px-5 py-20 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="eyebrow text-green">Dúvidas</p>
            <h2 id="faq-titulo" className="mt-3 text-[2.4rem] leading-[1.1] text-ink">Antes de comprar</h2>
            <Link href="/faq" className="link-underline mt-5 inline-block text-sm font-medium text-pine">
              Todas as perguntas
            </Link>
          </div>
          <FaqList items={faqs.slice(0, 5)} />
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-[1280px] px-5 pb-24 md:px-8">
        <div className="rule-top flex flex-col gap-8 pt-12 md:flex-row md:items-end md:justify-between">
          <p className="max-w-[24ch] font-display font-bold text-[2rem] leading-tight text-ink md:text-[2.6rem]">
            Comece pelo material que a sua etapa pede.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/loja" variant="accent" size="lg">
              Explorar materiais
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

function BestSellerRow({ product, rank }: { product: Product; rank: number }) {
  const q = quoteProduct(product);
  return (
    <li>
      <Link href={`/produto/${product.slug}`} className="group grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-5 py-5">
        <span className="font-display font-bold text-2xl text-line-strong tabular transition-colors group-hover:text-amber md:text-3xl">
          {String(rank).padStart(2, "0")}
        </span>
        <span className="relative hidden size-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-line sm:block">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-green-50 text-[9px] font-bold tracking-wide text-green">
              {(product.files?.[0]?.originalName.split(".").pop() ?? "DOC").toUpperCase().slice(0, 4)}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block eyebrow text-[0.6875rem] text-muted">
            {[product.categoryName, product.institutionName].filter(Boolean).join(" · ") || "Material"}
          </span>
          <span className="mt-1 block truncate font-display font-bold text-[1.3rem] text-ink transition-colors group-hover:text-pine">
            {product.name}
          </span>
        </span>
        <span className="hidden shrink-0 text-right sm:block">
          <span className="block font-sans text-lg font-semibold text-ink tabular">{formatMoney(q.totalCents)}</span>
          {q.promoActive && <span className="block text-xs text-muted tabular"><s>{formatMoney(q.listTotalCents)}</s></span>}
        </span>
      </Link>
    </li>
  );
}

/** Composição editorial: capas reais dos produtos + folha de documento da marca. */
function HeroVisual({ products }: { products: Product[] }) {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[30rem] lg:mr-0" aria-hidden="true">
      {/* Folha base */}
      <div className="absolute bottom-0 left-0 w-[58%] -rotate-[4deg] rounded-[var(--radius-md)] border border-line bg-sheet p-6 shadow-md">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 12 12" className="size-3 text-amber" fill="currentColor">
            <path d="M6 0 7.4 4.6 12 6 7.4 7.4 6 12 4.6 7.4 0 6 4.6 4.6Z" />
          </svg>
          <span className="eyebrow text-[0.625rem] text-green">Confiança</span>
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="h-2 w-full rounded-sm bg-ink/25" />
          <div className="h-2 w-5/6 rounded-sm bg-ink/20" />
          <div className="h-2 w-3/4 rounded-sm bg-ink/15" />
          <div className="h-2 w-4/5 rounded-sm bg-ink/12" />
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
          <svg viewBox="0 0 24 24" className="size-8 rounded-[var(--radius-xs)] bg-pine p-1.5 text-paper" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z" />
            <path d="M9 7V6a3 3 0 0 1 6 0v1" />
          </svg>
          <span className="text-xs text-muted">
            <span className="block font-medium text-ink">Entrega imediata</span>
            Pix ou cartão · Download ilimitado
          </span>
        </div>
      </div>

      {/* Capas reais dos produtos */}
      {products.length > 0 ? (
        <div className="absolute top-0 right-0 grid w-[54%] gap-4">
          {products.slice(0, 2).map((p, i) => (
            <div
              key={p.id}
              className={`relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] border border-line bg-green-50 shadow-sm ${i === 0 ? "rotate-[2deg]" : "-rotate-[2deg]"}`}
            >
              <Image src={p.imageUrl as string} alt="" fill sizes="(min-width:1024px) 18vw, 40vw" className="object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div className="absolute top-0 right-0 w-[54%] rotate-[2deg] rounded-[var(--radius-md)] border border-line bg-sheet p-5 shadow-sm">
          <span className="eyebrow text-[0.625rem] text-amber-ink">Documento</span>
          <div className="mt-3 space-y-2">
            <div className="h-2 w-full rounded-sm bg-ink/25" />
            <div className="h-2 w-11/12 rounded-sm bg-ink/20" />
            <div className="h-2 w-4/5 rounded-sm bg-ink/15" />
          </div>
        </div>
      )}

      {/* Selo */}
      <div className="absolute top-1/2 left-[46%] flex size-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-line bg-sheet text-center shadow-md">
        <span className="font-display font-bold text-lg leading-none text-pine">ABNT</span>
        <span className="mt-1 text-[9px] font-semibold tracking-[0.14em] text-muted">NORMAS</span>
      </div>
    </div>
  );
}
