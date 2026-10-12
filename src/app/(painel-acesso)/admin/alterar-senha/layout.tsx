import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { requireAdminSessionForPasswordChange } from "@/lib/admin/access";

export const metadata: Metadata = { title: "Alterar senha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminChangePasswordLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSessionForPasswordChange();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-5 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="mt-8 rounded-[var(--radius-lg)] border border-line bg-sheet p-7 shadow-sm md:p-9">{children}</div>
        <p className="mt-5 text-center text-xs text-muted">Painel Confiança Assessoria Acadêmica</p>
      </div>
    </div>
  );
}