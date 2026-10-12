"use client";

import { useEffect, useRef, useState } from "react";
import { previewCartAction } from "@/app/(store)/carrinho/actions";
import type { PricedCart } from "@/lib/cart/price-cart";
import { useCart } from "./cart-provider";

/** Pede ao servidor o carrinho precificado sempre que itens ou cupom mudam. */
export function usePricedCart() {
  const cart = useCart();
  const [priced, setPriced] = useState<PricedCart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  // Carregando = a última resposta não corresponde ao estado atual do carrinho.
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  const key = JSON.stringify([cart.lines.map((l) => [l.productId, l.quantity]), cart.couponCode]);

  useEffect(() => {
    if (!cart.ready) return;
    if (cart.lines.length === 0) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const res = await previewCartAction({ lines: cart.lines, couponCode: cart.couponCode ?? undefined });
      if (id !== requestId.current) return;
      if (res.ok) {
        setPriced(res.data);
        setError(null);
        // Remove itens que deixaram de existir/estar ativos.
        for (const r of res.data.removed) cart.remove(r.productId);
      } else {
        setError(res.error);
      }
      setResolvedKey(key);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cart.ready]);

  const empty = cart.lines.length === 0;
  return { cart, priced: empty ? null : priced, error: empty ? null : error, loading: empty ? false : resolvedKey !== key };
}
