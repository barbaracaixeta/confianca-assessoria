import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Alterar senha", robots: { index: false, follow: false } };

export default async function AdminChangePasswordPage() {
  const user = await getCurrentUser();
  const forced = user?.mustChangePassword ?? false;

  return (
    <>
      <h1 className="display text-[2.4rem] text-pine">Altere sua senha</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {forced
          ? "Por segurança, você precisa definir uma nova senha antes de continuar."
          : "Defina uma nova senha para a sua conta de acesso ao painel."}
      </p>
      <div className="mt-7">
        <ChangePasswordForm />
      </div>
    </>
  );
}