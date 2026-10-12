"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const schema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(2, "Informe o título.").max(120),
    subtitle: z.string().trim().max(240).nullable(),
    imagePath: z.string().trim().max(500).nullable(),
    ctaLabel: z.string().trim().max(60).nullable(),
    ctaHref: z.string().trim().max(500).nullable(),
    startsAt: z.string().nullable(),
    endsAt: z.string().nullable(),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999),
  })
  .refine((d) => !d.startsAt || !d.endsAt || d.startsAt < d.endsAt, { message: "O fim precisa ser depois do início.", path: ["endsAt"] });

function clean(value: string | null): string | null {
  return value && value.trim() ? value.trim() : null;
}

export async function saveBannerAction(input: z.infer<typeof schema>): Promise<Result<{ id: string }>> {
  const auth = await authorize("operator");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const data = {
    title: parsed.data.title,
    subtitle: clean(parsed.data.subtitle),
    image_path: clean(parsed.data.imagePath),
    cta_label: clean(parsed.data.ctaLabel),
    cta_href: clean(parsed.data.ctaHref),
    starts_at: parsed.data.startsAt ? new Date(parsed.data.startsAt).toISOString() : null,
    ends_at: parsed.data.endsAt ? new Date(parsed.data.endsAt).toISOString() : null,
    is_active: parsed.data.isActive,
    sort_order: parsed.data.sortOrder,
  };

  if (parsed.data.id) {
    const { data: updated, error } = await admin.from("banners").update(data).eq("id", parsed.data.id).select("id").single();
    if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };
    revalidatePath("/admin/banners");
    revalidatePath("/");
    return { ok: true, data: { id: updated.id } };
  }

  const { data: created, error } = await admin.from("banners").insert(data).select("id").single();
  if (error) return { ok: false, error: `Não foi possível criar: ${error.message}` };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true, data: { id: created.id } };
}

export async function toggleBannerAction(input: { id: string; isActive: boolean }): Promise<Result> {
  const auth = await authorize("operator");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("banners").update({ is_active: input.isActive }).eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function deleteBannerAction(input: { id: string }): Promise<Result> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("banners").delete().eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível remover: ${error.message}` };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true, data: undefined };
}
