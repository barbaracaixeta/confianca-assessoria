"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminPriceTiers } from "@/lib/admin/pricing";
import type { AdminSupabase } from "@/lib/supabase/admin";
import type { AdminPriceTierRow } from "@/lib/admin/pricing";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const tierSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  minQuantity: z.number().int().min(1).max(1_000_000),
  unitPriceCents: z.number().int().min(0).max(10_000_000),
});

async function revalidatePriceTier(admin: AdminSupabase, productId: string) {
  revalidatePath("/admin/precos");
  revalidatePath("/loja");
  const { data: product } = await admin.from("products").select("slug").eq("id", productId).maybeSingle();
  if (product?.slug) revalidatePath(`/produto/${product.slug}`);
}

export async function savePriceTierAction(input: z.infer<typeof tierSchema>): Promise<Result<{ id: string }>> {
  const auth = await authorize("operator");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = tierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const data = {
    product_id: parsed.data.productId,
    min_quantity: parsed.data.minQuantity,
    unit_price_cents: parsed.data.unitPriceCents,
  };

  if (parsed.data.id) {
    const { data: updated, error } = await admin.from("product_prices").update(data).eq("id", parsed.data.id).select("id").single();
    if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };
    await revalidatePriceTier(admin, parsed.data.productId);
    return { ok: true, data: { id: updated.id } };
  }

  const { data: created, error } = await admin.from("product_prices").insert(data).select("id").single();
  if (error) return { ok: false, error: `Não foi possível adicionar: ${error.message}` };
  await revalidatePriceTier(admin, parsed.data.productId);
  return { ok: true, data: { id: created.id } };
}

export async function deletePriceTierAction(input: { id: string; productId: string }): Promise<Result> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = z.object({ id: z.string().uuid(), productId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Faixa inválida." };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("product_prices").delete().eq("id", parsed.data.id);
  if (error) return { ok: false, error: `Não foi possível remover: ${error.message}` };
  await revalidatePriceTier(admin, parsed.data.productId);
  return { ok: true, data: undefined };
}

export async function loadPriceTiersAction(input: { productId: string }): Promise<Result<AdminPriceTierRow[]>> {
  const auth = await authorize("operator");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = z.object({ productId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Produto inválido." };
  return { ok: true, data: await getAdminPriceTiers(parsed.data.productId) };
}