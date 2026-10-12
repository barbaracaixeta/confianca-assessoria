"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminSupabase } from "@/lib/supabase/admin";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const schema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "Informe o nome.").max(120),
    description: z.string().trim().max(400).nullable(),
    bannerPath: z.string().trim().max(400).nullable(),
    discountType: z.enum(["percent", "fixed"]),
    discountValue: z.number().int().min(1).max(10_000_000),
    couponCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Za-z0-9_-]{3,32}$/, "Código de cupom inválido: 3 a 32 caracteres, sem espaços.")
      .nullable(),
    startsAt: z.string(),
    endsAt: z.string(),
    appliesToAll: z.boolean(),
    isActive: z.boolean(),
    productIds: z.array(z.string().uuid()),
  })
  .refine((d) => d.discountType !== "percent" || d.discountValue <= 100, { message: "Percentual máximo é 100.", path: ["discountValue"] })
  .refine((d) => d.startsAt < d.endsAt, { message: "O fim precisa ser depois do início.", path: ["endsAt"] })
  .refine((d) => d.appliesToAll || d.productIds.length > 0, { message: "Selecione ao menos um produto.", path: ["productIds"] });

async function revalidatePromotion(admin: AdminSupabase, promotionId: string, extraProductIds: string[] = []) {
  revalidatePath("/admin/promocoes");
  revalidatePath("/loja");
  const ids = new Set(extraProductIds);
  const { data: promo } = await admin.from("promotions").select("applies_to_all").eq("id", promotionId).maybeSingle();
  if (promo?.applies_to_all) {
    const { data: all } = await admin.from("products").select("slug");
    (all ?? []).forEach((p) => revalidatePath(`/produto/${p.slug}`));
    return;
  }
  const { data: links } = await admin.from("promotion_products").select("product_id").eq("promotion_id", promotionId);
  (links ?? []).forEach((l) => ids.add(l.product_id));
  if (ids.size === 0) return;
  const { data: products } = await admin.from("products").select("slug").in("id", [...ids]);
  (products ?? []).forEach((p) => revalidatePath(`/produto/${p.slug}`));
}

export async function savePromotionAction(input: z.infer<typeof schema>): Promise<Result<{ id: string }>> {
  const auth = await authorize("operator");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const data = {
    name: parsed.data.name,
    description: parsed.data.description || null,
    banner_path: parsed.data.bannerPath || null,
    discount_type: parsed.data.discountType,
    discount_value: parsed.data.discountValue,
    coupon_code: parsed.data.couponCode || null,
    starts_at: new Date(parsed.data.startsAt).toISOString(),
    ends_at: new Date(parsed.data.endsAt).toISOString(),
    applies_to_all: parsed.data.appliesToAll,
    is_active: parsed.data.isActive,
  };

  let promotionId = parsed.data.id ?? "";
  if (promotionId) {
    const { data: updated, error } = await admin.from("promotions").update(data).eq("id", promotionId).select("id").single();
    if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };
    promotionId = updated.id;
  } else {
    const { data: created, error } = await admin.from("promotions").insert(data).select("id").single();
    if (error) return { ok: false, error: `Não foi possível criar: ${error.message}` };
    promotionId = created.id;
  }

  const productIds = parsed.data.appliesToAll ? [] : parsed.data.productIds;
  await admin.from("promotion_products").delete().eq("promotion_id", promotionId);
  if (productIds.length > 0) {
    const { error } = await admin
      .from("promotion_products")
      .insert(productIds.map((productId) => ({ promotion_id: promotionId, product_id: productId })));
    if (error) return { ok: false, error: `Não foi possível vincular os produtos: ${error.message}` };
  }

  await revalidatePromotion(admin, promotionId, productIds);
  return { ok: true, data: { id: promotionId } };
}

export async function togglePromotionAction(input: { id: string; isActive: boolean }): Promise<Result> {
  const auth = await authorize("operator");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("promotions").update({ is_active: input.isActive }).eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };
  await revalidatePromotion(admin, input.id);
  return { ok: true, data: undefined };
}

export async function deletePromotionAction(input: { id: string }): Promise<Result> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Promoção inválida." };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  await revalidatePromotion(admin, parsed.data.id);
  const { error } = await admin.from("promotions").delete().eq("id", parsed.data.id);
  if (error) return { ok: false, error: `Não foi possível remover: ${error.message}` };
  return { ok: true, data: undefined };
}