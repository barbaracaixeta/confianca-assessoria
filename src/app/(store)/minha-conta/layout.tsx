import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { AccountNav } from "./account-nav";
import { signOutAction } from "../(auth)/actions";

// Depende da sessão: sempre renderizado por requisição.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/minha-conta");
  return (
    <div className="mx-auto grid max-w-[1240px] gap-10 px-5 pt-10 pb-24 md:px-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16 lg:pt-14">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <p className="text-sm text-muted">Conectado como</p>
        <p className="truncate text-sm font-medium text-ink">{user.email}</p>
        <AccountNav />
        <form action={signOutAction} className="mt-4 lg:mt-6">
          <button type="submit" className="text-sm text-muted hover:text-danger">Sair</button>
        </form>
      </aside>
      <div>{children}</div>
    </div>
  );
}
