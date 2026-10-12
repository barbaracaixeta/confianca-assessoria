"use server";

import { z } from "zod";
import { cartSchema, couponCodeSchema } from "@/lib/validation/schemas";
import { priceCart, type PricedCart } from "@/lib/cart/price-cart";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import type { CartLine } from "@/types/domain";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function currentCustomerId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.from("customers").select("id").eq("profile_id", user.id).maybeSingle()) ?? {};
  return (data?.id as string | undefined) ?? null;
}

/** Recalcula o carrinho no servidor (preços, faixas, promoções e cupom). */
export async function previewCartAction(input: { lines: CartLine[]; couponCode?: string }): Promise<Result<PricedCart>> {
  const parsed = z.object({ lines: cartSchema, couponCode: z.string().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Carrinho inválido." };

  let code: string | undefined;
  if (parsed.data.couponCode) {
    const limited = await rateLimit("coupon", 20, 60_000);
    if (!limited.ok) return { ok: false, error: "Muitas tentativas de cupom. Aguarde um minuto e tente de novo." };
    const c = couponCodeSchema.safeParse(parsed.data.couponCode);
    if (!c.success) return { ok: false, error: c.error.issues[0].message };
    code = c.data;
  }

  try {
    return { ok: true, data: await priceCart(parsed.data.lines, code, await currentCustomerId()) };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Não foi possível atualizar o carrinho agora. Tente novamente." };
  }
}

/**
 * Sincroniza o carrinho do visitante com o salvo na conta (se autenticado).
 * Retorna null quando não há usuário — o carrinho continua só no navegador.
 */
export async function syncCartAction(local: CartLine[]): Promise<CartLine[] | null> {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return null;

  const parsedLocal = cartSchema.safeParse(local);
  const { data } = await supabase.from("carts").select("items").eq("profile_id", user.id).maybeSingle();
  const saved = cartSchema.safeParse(data?.items ?? []);

  const merged = new Map<string, CartLine>();
  for (const l of saved.success ? saved.data : []) merged.set(l.productId, l);
  for (const l of parsedLocal.success ? parsedLocal.data : []) merged.set(l.productId, l);
  const items = [...merged.values()].slice(0, 30);

  await supabase.from("carts").upsert({ profile_id: user.id, items });
  return items;
}

export async function saveCartAction(lines: CartLine[]): Promise<void> {
  const parsed = cartSchema.safeParse(lines);
  if (!parsed.success) return;
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return;
  await supabase.from("carts").upsert({ profile_id: user.id, items: parsed.data });
}
