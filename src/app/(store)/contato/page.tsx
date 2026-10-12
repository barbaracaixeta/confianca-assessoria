import type { Metadata } from "next";
import Link from "next/link";
import { getCompanySettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 300;
export const metadata: Metadata = { title: "Contato", alternates: { canonical: absoluteUrl("/contato") } };

export default async function ContactPage() {
  const c = await getCompanySettings();
  const channels = [
    c.whatsapp && { label: "WhatsApp", value: c.whatsapp, href: `https://wa.me/${c.whatsapp.replace(/\D/g, "")}` },
    c.email && { label: "E-mail", value: c.email, href: `mailto:${c.email}` },
    c.phone && { label: "Telefone", value: c.phone, href: `tel:${c.phone.replace(/\D/g, "")}` },
    c.instagram && { label: "Instagram", value: c.instagram.replace(/^https?:\/\/(www\.)?/, ""), href: c.instagram },
  ].filter(Boolean) as { label: string; value: string; href: string }[];

  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-12 pb-24 md:px-8 md:pt-16">
      <h1 className="display text-[3rem] text-pine md:text-[4.25rem]">Contato</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
        Para dúvidas sobre um pedido em andamento, use as mensagens na página do pedido: a equipe responsável responde por lá.
      </p>
      {channels.length > 0 ? (
        <dl className="mt-14 grid gap-8 border-t border-ink/80 pt-8 md:grid-cols-3">
          {channels.map((ch) => (
            <div key={ch.label}>
              <dt className="text-sm text-muted">{ch.label}</dt>
              <dd className="mt-1 font-display font-bold text-xl"><a href={ch.href} className="text-ink hover:text-pine">{ch.value}</a></dd>
            </div>
          ))}
          {c.address && (
            <div><dt className="text-sm text-muted">Endereço</dt><dd className="mt-1 text-ink">{c.address}</dd></div>
          )}
        </dl>
      ) : (
        <p className="mt-14 border-t border-line pt-8 text-muted">
          Os canais de atendimento ainda não foram publicados. Enquanto isso, veja as{" "}
          <Link href="/faq" className="text-pine underline underline-offset-2">perguntas frequentes</Link>.
        </p>
      )}
    </div>
  );
}
