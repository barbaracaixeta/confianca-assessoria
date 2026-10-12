import type { Metadata } from "next";
import { AuthShell } from "../auth-shell";
import { NewPasswordForm } from "../auth-forms";
import { requireUser } from "@/lib/auth/session";

// Depende da sessão: sempre renderizado por requisição.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };

export default async function ResetPasswordPage() {
  await requireUser("/redefinir-senha");
  return (
    <AuthShell title="Nova senha" intro="Escolha uma senha nova para a sua conta.">
      <NewPasswordForm />
    </AuthShell>
  );
}
