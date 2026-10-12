"use client";

import { createContext, use, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { cartSchema } from "@/lib/validation/schemas";
import { saveCartAction, syncCartAction } from "@/app/(store)/carrinho/actions";
import type { CartLine } from "@/types/domain";

const STORAGE_KEY = "confianca.cart.v1";
const COUPON_KEY = "confianca.coupon.v1";

// ---------------------------------------------------------------------
// Store externo: localStorage validado por schema + cache em memória.
// ---------------------------------------------------------------------
interface CartSnapshot {
  lines: CartLine[];
  couponCode: string | null;
}

const EMPTY: CartSnapshot = { lines: [], couponCode: null };
let snapshot: CartSnapshot | null = null;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function readStorage(): CartSnapshot {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? cartSchema.safeParse(JSON.parse(raw)) : null;
    return { lines: parsed?.success ? parsed.data : [], couponCode: window.localStorage.getItem(COUPON_KEY) };
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): CartSnapshot {
  snapshot ??= readStorage();
  return snapshot;
}

function emit() {
  for (const l of listeners) l();
}

function setSnapshot(next: CartSnapshot, persistRemote = true) {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.lines));
    if (next.couponCode) window.localStorage.setItem(COUPON_KEY, next.couponCode);
    else window.localStorage.removeItem(COUPON_KEY);
  } catch {
    // Armazenamento indisponível (aba privada): segue em memória.
  }
  emit();
  if (persistRemote) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void saveCartAction(next.lines).catch(() => {}), 600);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === COUPON_KEY) {
      snapshot = readStorage();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noopSubscribe = () => () => {};

// ---------------------------------------------------------------------

interface CartContextValue {
  lines: CartLine[];
  count: number;
  ready: boolean;
  couponCode: string | null;
  addedTick: number;
  add: (line: CartLine) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setNotes: (productId: string, notes: string) => void;
  remove: (productId: string) => void;
  setCouponCode: (code: string | null) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  // false no servidor e na hidratação; true depois — evita divergência de HTML.
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [addedTick, setAddedTick] = useState(0);

  // Mescla com o carrinho salvo na conta quando houver sessão.
  useEffect(() => {
    syncCartAction(getSnapshot().lines)
      .then((merged) => merged && setSnapshot({ ...getSnapshot(), lines: merged }, false))
      .catch(() => {});
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const { lines, couponCode } = state;
    const update = (next: CartLine[]) => setSnapshot({ ...getSnapshot(), lines: next });
    return {
      lines,
      count: lines.length,
      ready,
      couponCode,
      addedTick,
      add(line) {
        const exists = lines.some((l) => l.productId === line.productId);
        update(exists ? lines.map((l) => (l.productId === line.productId ? { ...l, ...line } : l)) : [...lines, line]);
        setAddedTick((t) => t + 1);
      },
      setQuantity: (id, quantity) => update(lines.map((l) => (l.productId === id ? { ...l, quantity } : l))),
      setNotes: (id, notes) => update(lines.map((l) => (l.productId === id ? { ...l, notes } : l))),
      remove: (id) => update(lines.filter((l) => l.productId !== id)),
      setCouponCode: (code) => setSnapshot({ ...getSnapshot(), couponCode: code }, false),
      clear: () => setSnapshot(EMPTY),
    };
  }, [state, ready, addedTick]);

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const ctx = use(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de CartProvider");
  return ctx;
}
