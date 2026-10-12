import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default async function SignUpPage({ searchParams }: PageProps<"/cadastro">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/minha-conta";
  const email = typeof sp.email === "string" ? sp.email : undefined;
  return (
    <AuthShell
      title="Criar conta"
      intro="Com a conta você envia arquivos com segurança e vê todos os seus pedidos em um só lugar."
      footer={<>Já tem conta? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-pine underline-offset-2 hover:underline">Entrar</Link></>}
    >
      <SignUpForm next={next} email={email} />
    </AuthShell>
  );
}
