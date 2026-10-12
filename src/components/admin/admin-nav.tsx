"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/admin/permissions";

interface NavItem {
  label: string;
  href?: string; // sem href = módulo ainda não entregue (exibido como indisponível, nunca como link falso)
  permission?: Permission;
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operação",
    items: [
      { label: "Dashboard", href: "/admin", permission: "dashboard.view" },
      { label: "Pedidos", href: "/admin/pedidos", permission: "orders.view" },
      { label: "Clientes", href: "/admin/clientes", permission: "customers.view" },
      { label: "Pagamentos", href: "/admin/pagamentos", permission: "orders.view" },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { label: "Produtos", href: "/admin/produtos", permission: "products.view" },
      { label: "Categorias", href: "/admin/categorias", permission: "products.view" },
      { label: "Cupons", href: "/admin/cupons", permission: "products.view" },
      { label: "Preços", href: "/admin/precos", permission: "products.view" },
      { label: "Promoções", href: "/admin/promocoes", permission: "products.view" },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { label: "Banners", href: "/admin/banners", permission: "content.view" },
      { label: "Depoimentos", href: "/admin/depoimentos", permission: "content.view" },
      { label: "FAQ", href: "/admin/faq", permission: "content.view" },
      { label: "Conteúdo", href: "/admin/conteudo", permission: "content.view" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Configurações", href: "/admin/configuracoes", permission: "settings.view" },
      { label: "Administradores", href: "/admin/administradores", permission: "admins.view" },
    ],
  },
];

export function AdminNav({ permissions }: { permissions: Permission[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const allowed = new Set<Permission>(permissions);

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
        {GROUPS.map((g) => {
          const items = g.items.filter((it) => !it.permission || allowed.has(it.permission));
          if (items.length === 0) return null;
          return (
            <div key={g.title} className="mt-4 first:mt-0">
              <p className="px-2 pb-1.5 text-xs font-medium text-muted">{g.title}</p>
              <ul>
                {items.map((it) => {
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
          );
        })}
      </nav>
    </>
  );
}