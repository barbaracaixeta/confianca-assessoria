import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getCompanySettings } from "@/lib/settings";
import { getActiveCategories, getActiveProducts } from "@/lib/catalog/queries";

export async function SiteFooter() {
  const [company, products, categories] = await Promise.all([getCompanySettings(), getActiveProducts(), getActiveCategories()]);
  const contacts = [
    company.email && { label: company.email, href: `mailto:${company.email}` },
    company.whatsapp && { label: `WhatsApp ${company.whatsapp}`, href: `https://wa.me/${company.whatsapp.replace(/\D/g, "")}` },
    company.phone && { label: company.phone, href: `tel:${company.phone.replace(/\D/g, "")}` },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <footer className="bg-pine text-paper/80">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 pt-16 pb-10 md:grid-cols-[1.3fr_1fr_1fr] md:px-8">
        <div className="max-w-sm">
          <Logo tone="light" />
          <p className="mt-6 font-serif text-lg leading-relaxed text-paper">
            Materiais acadêmicos para facilitar a sua jornada.
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            Modelos, templates, guias e e-books de apoio para você estudar, organizar e apresentar seus trabalhos com segurança.
          </p>
        </div>

        <nav aria-label="Loja">
          <h2 className="font-sans text-sm font-semibold text-paper">Loja</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {products.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link href={`/produto/${p.slug}`} className="link-underline hover:text-paper">
                  {p.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/loja" className="link-underline hover:text-paper">Ver todos os produtos</Link>
            </li>
          </ul>
          <ul className="mt-4 flex flex-wrap gap-2">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/categoria/${c.slug}`} className="link-underline text-sm hover:text-paper">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-sans text-sm font-semibold text-paper">Atendimento</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {contacts.map((c) => (
              <li key={c.href}>
                <a href={c.href} className="link-underline hover:text-paper">
                  {c.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/contato" className="link-underline hover:text-paper">Fale conosco</Link>
            </li>
            <li>
              <Link href="/faq" className="link-underline hover:text-paper">Perguntas frequentes</Link>
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
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-5 py-6 text-xs text-paper/60 md:flex-row md:justify-between md:px-8">
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
