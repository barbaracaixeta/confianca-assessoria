"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/domain";

interface NavItem {
  label: string;
  href?: string; // sem href = módulo ainda não entregue (exibido como indisponível, nunca como link falso)
  minRole?: AppRole;
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operação",
    items: [
      { label: "Dashboard", href: "/admin" },
      { label: "Pedidos", href: "/admin/pedidos" },
      { label: "Clientes", href: "/admin/clientes" },
      { label: "Pagamentos", href: "/admin/pagamentos" },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { label: "Produtos", href: "/admin/produtos" },
      { label: "Categorias", href: "/admin/categorias" },
      { label: "Cupons", href: "/admin/cupons" },
      { label: "Preços", href: "/admin/precos" },
      { label: "Promoções", href: "/admin/promocoes" },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { label: "Banners", href: "/admin/banners" },
      { label: "Depoimentos", href: "/admin/depoimentos" },
      { label: "FAQ", href: "/admin/faq" },
      { label: "Conteúdo", href: "/admin/conteudo", minRole: "admin" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Configurações", href: "/admin/configuracoes", minRole: "admin" },
      { label: "Administradores", href: "/admin/administradores", minRole: "super_admin" },
    ],
  },
];

const RANK: Record<AppRole, number> = { customer: 0, operator: 1, admin: 2, super_admin: 3 };

export function AdminNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="mx-5 mb-4 flex h-10 w-[calc(100%-2.5rem)] items-center justify-between rounded-[var(--radius-sm)] border border-line px-3 text-sm lg:hidden"
        aria-expanded={open}
        aria-controls="admin-menu"
        onClick={() => setOpen((v) => !v)}
      >
        Menu do painel
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <nav id="admin-menu" aria-label="Painel" className={cn("overflow-y-auto px-3 pb-6 lg:block", !open && "hidden")}>
        {GROUPS.map((g) => (
          <div key={g.title} className="mt-4 first:mt-0">
            <p className="px-2 pb-1.5 text-xs font-medium text-muted">{g.title}</p>
            <ul>
              {g.items
                .filter((it) => RANK[role] >= RANK[it.minRole ?? "operator"])
                .map((it) => {
                  if (!it.href) {
                    return (
                      <li key={it.label}>
                        <span className="flex items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-muted/70" aria-disabled="true">
                          {it.label}
                          <span className="text-[10px] text-muted/70">em breve</span>
                        </span>
                      </li>
                    );
                  }
                  const active = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
                  return (
                    <li key={it.label}>
                      <Link
                        href={it.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block rounded-[var(--radius-sm)] px-2 py-1.5 text-sm transition-colors",
                          active ? "bg-green-50 font-medium text-pine" : "text-ink-2 hover:bg-paper hover:text-pine",
                        )}
                      >
                        {it.label}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
