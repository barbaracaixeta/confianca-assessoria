import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getCompanySettings } from "@/lib/settings";
import { getActiveCategories, getActiveInstitutions } from "@/lib/catalog/queries";

export async function SiteFooter() {
  const [company, categories, institutions] = await Promise.all([
    getCompanySettings(),
    getActiveCategories(),
    getActiveInstitutions(),
  ]);
  const contacts = [
    company.email && { label: company.email, href: `mailto:${company.email}` },
    company.whatsapp && { label: `WhatsApp ${company.whatsapp}`, href: `https://wa.me/${company.whatsapp.replace(/\D/g, "")}` },
    company.phone && { label: company.phone, href: `tel:${company.phone.replace(/\D/g, "")}` },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <footer className="bg-pine text-paper/80">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-5 pt-16 pb-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
        <div className="max-w-sm">
          <Logo tone="light" className="h-[72px]" />
          <p className="mt-6 font-display font-bold text-lg leading-relaxed text-paper">
            Materiais acadêmicos para facilitar a sua jornada.
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            Modelos, templates, guias e e-books de apoio para você estudar, organizar e apresentar seus trabalhos com segurança.
          </p>
        </div>

        <nav aria-label="Catálogo">
          <h2 className="font-sans text-sm font-semibold text-paper">Categorias</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {categories.slice(0, 7).map((c) => (
              <li key={c.id}>
                <Link href={`/categoria/${c.slug}`} className="link-underline hover:text-paper">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/loja" className="link-underline hover:text-paper">Ver tudo</Link>
            </li>
          </ul>
          {institutions.length > 0 && (
            <>
              <h2 className="mt-6 font-sans text-sm font-semibold text-paper">Instituições</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {institutions.slice(0, 5).map((i) => (
                  <li key={i.id}>
                    <Link href={`/instituicoes/${i.slug}`} className="link-underline hover:text-paper">
                      {i.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/instituicoes" className="link-underline hover:text-paper">Ver todas</Link>
                </li>
              </ul>
            </>
          )}
        </nav>

        <nav aria-label="Institucional">
          <h2 className="font-sans text-sm font-semibold text-paper">Institucional</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/sobre" className="link-underline hover:text-paper">Quem somos</Link></li>
            <li><Link href="/como-funciona" className="link-underline hover:text-paper">Como funciona</Link></li>
            <li><Link href="/termos" className="link-underline hover:text-paper">Termos de uso</Link></li>
            <li><Link href="/privacidade" className="link-underline hover:text-paper">Privacidade</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="font-sans text-sm font-semibold text-paper">Ajuda</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {contacts.map((c) => (
              <li key={c.href}>
                <a href={c.href} className="link-underline hover:text-paper">
                  {c.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/faq" className="link-underline hover:text-paper">Perguntas frequentes</Link>
            </li>
            <li>
              <Link href="/contato" className="link-underline hover:text-paper">Fale conosco</Link>
            </li>
            <li>
              <Link href="/minha-conta" className="link-underline hover:text-paper">Acompanhar pedido</Link>
            </li>
            <li>
              <Link href="/minha-conta/produtos" className="link-underline hover:text-paper">Meus produtos</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/12">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-6 text-xs text-paper/60 md:flex-row md:justify-between md:px-8">
          <p>
            © {new Date().getFullYear()} {company.name}
            {company.cnpj && <> — CNPJ {company.cnpj}</>}
          </p>
          <p className="flex gap-5">
            <Link href="/termos" className="hover:text-paper">Termos de uso</Link>
            <Link href="/privacidade" className="hover:text-paper">Privacidade</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
