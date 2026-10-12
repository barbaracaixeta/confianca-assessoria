"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/minha-conta", label: "Visão geral" },
  { href: "/minha-conta/produtos", label: "Meus produtos" },
  { href: "/minha-conta/pedidos", label: "Pedidos" },
  { href: "/minha-conta/arquivos", label: "Arquivos" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Minha conta" className="mt-6 -mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0">
      <ul className="flex gap-1.5 lg:flex-col lg:gap-0.5">
        {ITEMS.map((it) => {
          const active = it.href === "/minha-conta" ? pathname === it.href : pathname.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2 text-[0.9375rem] transition-colors",
                  active ? "bg-green-50 font-medium text-pine" : "text-ink-2 hover:bg-green-50/60 hover:text-pine",
                )}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
