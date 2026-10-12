import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminArea } from "@/lib/admin/access";
import { signOutAction } from "@/app/(store)/(auth)/actions";

export const metadata: Metadata = { title: { default: "Painel", template: "%s | Painel Confiança" }, robots: { index: false, follow: false } };

const ROLE_LABEL = { customer: "Cliente", operator: "Operador", admin: "Administrador", super_admin: "Super admin" } as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminArea();
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-sheet lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin" aria-label="Painel — início">
            <Logo compact />
          </Link>
          <Link href="/" className="text-xs text-muted hover:text-pine">Ver loja</Link>
        </div>
        <AdminNav role={user.role} />
        <div className="mt-auto hidden border-t border-line px-5 py-4 lg:block">
          <p className="truncate text-sm font-medium text-ink">{user.fullName || user.email}</p>
          <p className="text-xs text-muted">{ROLE_LABEL[user.role]}</p>
          {!user.preview && (
            <form action={signOutAction} className="mt-2">
              <button type="submit" className="text-xs text-muted hover:text-danger">Sair</button>
            </form>
          )}
        </div>
      </aside>
      <div className="min-w-0">
        {user.preview && (
          <div className="bg-ink px-5 py-2 text-xs text-paper/85 md:px-10">
            Prévia local sem Supabase: números fictícios apenas para visualizar o painel. Em produção o acesso exige login de equipe.
          </div>
        )}
        <main className="px-5 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
