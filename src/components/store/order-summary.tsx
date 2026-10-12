"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/feedback";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PricedCart } from "@/lib/cart/price-cart";

export function CouponForm({
  couponCode,
  coupon,
  onApply,
  onRemove,
}: {
  couponCode: string | null;
  coupon: PricedCart["coupon"];
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const code = value.trim().toUpperCase();
    if (code) onApply(code);
  }

  if (couponCode && coupon?.status === "applied") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-green-100 bg-green-50 px-3 py-2.5 text-sm">
        <span>
          Cupom <strong className="tabular text-pine">{couponCode}</strong> aplicado
        </span>
        <button type="button" onClick={onRemove} className="text-sm font-medium text-ink-2 underline underline-offset-2 hover:text-pine">
          Remover
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <label htmlFor="cupom" className="text-sm font-medium text-ink">
        Cupom de desconto
      </label>
      <div className="flex gap-2">
        <Input
          id="cupom"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Código"
          autoComplete="off"
          className="uppercase placeholder:normal-case"
          aria-invalid={coupon?.status === "rejected" || undefined}
          aria-describedby={coupon?.status === "rejected" ? "cupom-erro" : undefined}
        />
        <Button type="submit" variant="outline" disabled={!value.trim()}>
          Aplicar
        </Button>
      </div>
      {coupon?.status === "rejected" && couponCode && (
        <p id="cupom-erro" role="alert" className="text-xs font-medium text-danger">
          {coupon.message}{" "}
          <button type="button" onClick={onRemove} className="underline underline-offset-2">
            Limpar
          </button>
        </p>
      )}
    </form>
  );
}

export function TrustList({ className }: { className?: string }) {
  const items = [
    ["Padlock", "Pagamento seguro", "Pix ou cartão com criptografia."],
    ["Box", "Produto digital", "Entrega via download liberado após confirmação."],
    ["Bolt", "Liberação automática", "Sem espera manual: o acesso é liberado sozinho."],
  ] as const;
  return (
    <ul className={cn("space-y-2.5 text-sm text-muted", className)}>
      {items.map(([icon, title, body]) => (
        <li key={title} className="flex items-start gap-2.5">
          <TrustIcon name={icon} />
          <span>
            <span className="font-medium text-ink">{title}</span> — {body}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TrustIcon({ name }: { name: "Padlock" | "Box" | "Bolt" }) {
  const paths = {
    Padlock: (
      <>
        <rect x="4.5" y="10" width="15" height="10" rx="1.5" />
        <path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" />
      </>
    ),
    Box: (
      <>
        <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
        <path d="M4 7l8 4 8-4M12 11v10" />
      </>
    ),
    Bolt: <path d="M13 2.5 5 13h5l-1 8.5L17 11h-5l1-8.5Z" />,
  }[name];
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-green" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {paths}
    </svg>
  );
}

export function Totals({ priced, loading, children }: { priced: PricedCart | null; loading: boolean; children?: ReactNode }) {
  if (!priced) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    );
  }
  const { subtotalCents, discountCents, totalCents } = priced.totals;
  return (
    <dl className={loading ? "space-y-2.5 text-sm opacity-60 transition-opacity" : "space-y-2.5 text-sm transition-opacity"} aria-busy={loading}>
      <div className="flex justify-between">
        <dt className="text-muted">Subtotal</dt>
        <dd className="tabular text-ink">{formatMoney(subtotalCents)}</dd>
      </div>
      {discountCents > 0 && (
        <div className="flex justify-between">
          <dt className="text-muted">Desconto</dt>
          <dd className="tabular font-medium text-amber-ink">−{formatMoney(discountCents)}</dd>
        </div>
      )}
      {children}
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <dt className="font-medium text-ink">Total</dt>
        <dd className="font-sans text-2xl font-semibold text-ink tabular">{formatMoney(totalCents)}</dd>
      </div>
    </dl>
  );
}
