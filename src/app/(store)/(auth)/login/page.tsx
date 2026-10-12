import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "../auth-forms";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/minha-conta";

  // Já autenticado não precisa ver o formulário de novo.
  if (await getCurrentUser()) redirect(next);

  return (
    <AuthShell
      title="Entrar"
      intro="Acompanhe pedidos, envie arquivos e converse com a equipe."
      footer={<>Ainda não tem conta? <Link href={`/cadastro?next=${encodeURIComponent(next)}`} className="font-medium text-pine underline-offset-2 hover:underline">Criar conta</Link></>}
    >
      <SignInForm next={next} linkError={sp.erro === "link"} />
    </AuthShell>
  );
}
