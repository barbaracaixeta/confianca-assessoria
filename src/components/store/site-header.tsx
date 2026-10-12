"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { useCart } from "./cart-provider";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Category } from "@/types/domain";

export function SiteHeader({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useIsAuthenticated();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSearchOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const accountHref = isAuthenticated ? "/minha-conta" : "/login";
  const accountLabel = isAuthenticated ? "Minha conta" : "Entrar";

  const NAV = [
    { href: "/loja", label: "Loja" },
    { href: "/loja?mais-vendidos=1", label: "Mais vendidos" },
    { href: "/loja?ofertas=1", label: "Ofertas" },
    { href: "/sobre", label: "Sobre" },
    { href: "/faq", label: "FAQ" },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-paper/85 backdrop-blur-[10px] transition-[border-color,box-shadow] duration-300",
        "border-b",
        scrolled ? "border-line shadow-xs" : "border-transparent",
      )}
    >
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-sheet focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <div className="mx-auto grid h-[76px] max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 md:px-8">
        <Link href="/" aria-label="Confiança Assessoria Acadêmica — página inicial" className="shrink-0">
          <span className="hidden sm:block">
            <Logo />
          </span>
          <span className="sm:hidden">
            <Logo compact />
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center justify-center gap-7">
            <li>
              <HeaderLink href="/" pathname={pathname}>
                Início
              </HeaderLink>
            </li>
            <li>
              <HeaderLink href="/loja" pathname={pathname}>
                Loja
              </HeaderLink>
            </li>
            {categories.length > 0 && (
              <li>
                <DropdownCategorias categories={categories} />
              </li>
            )}
            {NAV.slice(1).map((item) => (
              <li key={item.href}>
                <HeaderLink href={item.href} pathname={pathname}>
                  {item.label}
                </HeaderLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-end gap-1 md:gap-1.5">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-expanded={searchOpen}
            aria-controls={searchId}
            aria-label={searchOpen ? "Fechar busca" : "Abrir busca"}
            className="inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-ink-2 transition-colors hover:bg-green-50 hover:text-pine"
          >
            <svg viewBox="0 0 24 24" className="size-[21px]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
          </button>

          <CartLink />

          <Link
            href={accountHref}
            className="ml-1 hidden items-center gap-2 rounded-[var(--radius-sm)] border border-line-strong px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-pine hover:text-pine sm:inline-flex"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 19a7 7 0 0 1 14 0" />
            </svg>
            {accountLabel}
          </Link>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-ink transition-colors hover:bg-green-50 lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h10" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Busca expansível */}
      {searchOpen && (
        <div id={searchId} className="border-t border-line bg-sheet">
          <form
            className="mx-auto flex max-w-[1280px] items-center gap-3 px-5 py-4 md:px-8"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q")?.toString().trim();
              setSearchOpen(false);
              router.push(q ? `/loja?q=${encodeURIComponent(q)}` : "/loja");
            }}
          >
            <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
            <input
              ref={searchInputRef}
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Buscar por TCC, ABNT, template, e-book…"
              aria-label="Buscar produtos"
              className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted"
            />
            <button type="submit" className="shrink-0 font-medium text-pine hover:underline">
              Buscar
            </button>
          </form>
        </div>
      )}

      {/* Menu mobile: painel de largura total com tipografia editorial */}
      <div
        id="menu-mobile"
        ref={menuRef}
        hidden={!open}
        className="fixed inset-x-0 top-[76px] bottom-0 z-40 overflow-y-auto bg-paper px-5 pt-6 pb-10 lg:hidden"
      >
        <nav aria-label="Menu">
          <ul className="border-t border-line">
            {[{ href: "/", label: "Início" }, { href: "/loja", label: "Loja" }, ...NAV.slice(1)].map((item) => (
              <li key={item.href} className="border-b border-line">
                <Link href={item.href} className="block py-4 font-serif text-[1.75rem] text-ink hover:text-pine">
                  {item.label}
                </Link>
              </li>
            ))}
            {categories.length > 0 && (
              <li className="border-b border-line">
                <p className="pt-4 text-xs font-medium text-muted">Categorias</p>
                <ul className="mt-1 pb-3">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link href={`/categoria/${c.slug}`} className="block py-1.5 text-[0.9375rem] text-ink-2 hover:text-pine">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </nav>
        <div className="mt-8 flex flex-col gap-3">
          <ButtonLink href="/loja" size="lg">
            Explorar materiais
          </ButtonLink>
          <ButtonLink href={accountHref} variant="outline" size="lg">
            {accountLabel}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

function HeaderLink({
  href,
  pathname,
  children,
}: {
  href: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const hasQuery = href.includes("?");
  const base = href.split("?")[0];
  const active = !hasQuery && (base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(`${base}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "link-underline py-1 text-[0.9375rem] transition-colors",
        active ? "text-pine [background-size:100%_1px]" : "text-ink-2 hover:text-pine",
      )}
    >
      {children}
    </Link>
  );
}

function DropdownCategorias({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className="link-underline flex items-center gap-1 py-1 text-[0.9375rem] text-ink-2 transition-colors hover:text-pine"
      >
        Categorias
        <svg viewBox="0 0 12 12" className="size-3 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 pt-2">
          <ul className="min-w-[230px] rounded-[var(--radius-md)] border border-line bg-sheet p-2 shadow-md">
            <li>
              <Link href="/loja" className="block rounded-[var(--radius-xs)] px-3 py-2 text-sm font-medium text-pine hover:bg-green-50">
                Todas as categorias
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categoria/${c.slug}`} className="block rounded-[var(--radius-xs)] px-3 py-2 text-sm text-ink-2 hover:bg-green-50 hover:text-pine">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CartLink() {
  const { count, ready, addedTick } = useCart();
  return (
    <Link
      href="/carrinho"
      className="relative inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-ink-2 transition-colors hover:bg-green-50 hover:text-pine"
      aria-label={ready && count > 0 ? `Carrinho com ${count} ${count === 1 ? "produto" : "produtos"}` : "Carrinho"}
    >
      <svg viewBox="0 0 24 24" className="size-[21px]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z" />
        <path d="M9 7V6a3 3 0 0 1 6 0v1" />
      </svg>
      {ready && count > 0 && (
        <span
          key={addedTick}
          className="absolute -top-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full bg-amber text-[11px] font-bold text-pine-900 tabular motion-safe:animate-[pop_0.4s_ease-out]"
        >
          {count}
        </span>
      )}
    </Link>
  );
}

/**
 * Estado de sessão lido no navegador para manter as páginas públicas estáticas.
 *
 * O login/cadastro acontece via Server Action, que grava o cookie de sessão no
 * servidor — o cliente do navegador não recebe o evento SIGNED_IN. Por isso,
 * além de assinar onAuthStateChange, revalidamos a sessão a cada navegação
 * (pathname) e quando a aba volta ao foco, para o cabeçalho refletir o login
 * sem exigir recarga manual.
 */
function useIsAuthenticated() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;
    const sync = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (active) setAuthed(Boolean(data.session));
      });
    };

    sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      active = false;
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [pathname]);

  return authed;
}
