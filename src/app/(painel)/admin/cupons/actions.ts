"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizePermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const schema = z
  .object({
    id: z.string().uuid().optional(),
    code: z.string().trim().toUpperCase().regex(/^[A-Za-z0-9_-]{3,32}$/, "Código inválido: 3 a 32 caracteres, sem espaços."),
    description: z.string().trim().max(200).nullable(),
    type: z.enum(["percent", "fixed"]),
    value: z.number().int().min(1).max(10_000_000),
    startsAt: z.string().nullable(),
    endsAt: z.string().nullable(),
    usageLimit: z.number().int().min(1).nullable(),
    perCustomerLimit: z.number().int().min(1).nullable(),
    minOrderCents: z.number().int().min(0),
    appliesToAll: z.boolean(),
    firstOrderOnly: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((d) => d.type !== "percent" || d.value <= 100, { message: "Percentual máximo é 100.", path: ["value"] })
  .refine((d) => !d.startsAt || !d.endsAt || d.startsAt < d.endsAt, { message: "O fim precisa ser depois do início.", path: ["endsAt"] });

export async function saveCouponAction(input: z.infer<typeof schema>): Promise<Result<{ id: string }>> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const data = {
    code: parsed.data.code,
    description: parsed.data.description || null,
    type: parsed.data.type,
    value: parsed.data.value,
    starts_at: parsed.data.startsAt ? new Date(parsed.data.startsAt).toISOString() : null,
    ends_at: parsed.data.endsAt ? new Date(parsed.data.endsAt).toISOString() : null,
    usage_limit: parsed.data.usageLimit,
    per_customer_limit: parsed.data.perCustomerLimit,
    min_order_cents: parsed.data.minOrderCents,
    applies_to_all: parsed.data.appliesToAll,
    first_order_only: parsed.data.firstOrderOnly,
    is_active: parsed.data.isActive,
  };

  if (parsed.data.id) {
    const { data: updated, error } = await admin.from("coupons").update(data).eq("id", parsed.data.id).select("id").single();
    if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };
    return { ok: true, data: { id: updated.id } };
  }

  const { data: created, error } = await admin.from("coupons").insert(data).select("id").single();
  if (error) return { ok: false, error: `Não foi possível criar: ${error.message}` };
  revalidatePath("/admin/cupons");
  return { ok: true, data: { id: created.id } };
}

export async function toggleCouponAction(input: { id: string; isActive: boolean }): Promise<Result> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("coupons").update({ is_active: input.isActive }).eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };
  revalidatePath("/admin/cupons");
  return { ok: true, data: undefined };
}

export async function deleteCouponAction(input: { id: string }): Promise<Result> {
  const auth = await authorizePermission("products.delete");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("coupons").delete().eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível remover: ${error.message}` };
  revalidatePath("/admin/cupons");
  return { ok: true, data: undefined };
}