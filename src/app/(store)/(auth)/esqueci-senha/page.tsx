import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { ResetRequestForm } from "../auth-forms";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar senha"
      intro="Informe o e-mail da conta. Enviaremos um link para você criar uma nova senha."
      footer={<Link href="/login" className="font-medium text-pine underline-offset-2 hover:underline">Voltar para o login</Link>}
    >
      <ResetRequestForm />
    </AuthShell>
  );
}
