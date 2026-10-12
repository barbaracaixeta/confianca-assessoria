import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
export const metadata: Metadata = { title: "Acesso não autorizado", robots: { index: false } };
export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
      <h1 className="display text-[3.3rem] text-pine">Acesso não autorizado</h1>
      <p className="mt-5 max-w-md text-lg text-ink-2">Sua conta não tem permissão para abrir esta área. Se precisar de acesso, peça a um administrador.</p>
      <div className="mt-8 flex gap-3"><ButtonLink href="/minha-conta">Ir para minha conta</ButtonLink><ButtonLink href="/" variant="outline">Página inicial</ButtonLink></div>
    </div>
  );
}
