"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizePermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const schema = z.object({
  id: z.string().uuid().optional(),
  authorName: z.string().trim().min(2, "Informe o nome do autor.").max(80),
  authorDetail: z.string().trim().max(120).nullable(),
  photoPath: z.string().trim().max(500).nullable(),
  body: z.string().trim().min(2, "Informe o depoimento.").max(1200),
  productId: z.string().uuid().nullable().or(z.literal("").transform(() => null)),
  rating: z.number().int().min(1).max(5).nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

function clean(value: string | null): string | null {
  return value && value.trim() ? value.trim() : null;
}

export async function saveTestimonialAction(input: z.infer<typeof schema>): Promise<Result<{ id: string }>> {
  const auth = await authorizePermission("content.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const data = {
    author_name: parsed.data.authorName,
    author_detail: clean(parsed.data.authorDetail),
    photo_path: clean(parsed.data.photoPath),
    body: parsed.data.body,
    product_id: parsed.data.productId,
    rating: parsed.data.rating,
    is_active: parsed.data.isActive,
    sort_order: parsed.data.sortOrder,
  };

  if (parsed.data.id) {
    const { data: updated, error } = await admin.from("testimonials").update(data).eq("id", parsed.data.id).select("id").single();
    if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };
    revalidatePath("/admin/depoimentos");
    revalidatePath("/");
    return { ok: true, data: { id: updated.id } };
  }

  const { data: created, error } = await admin.from("testimonials").insert(data).select("id").single();
  if (error) return { ok: false, error: `Não foi possível criar: ${error.message}` };
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
  return { ok: true, data: { id: created.id } };
}

export async function toggleTestimonialAction(input: { id: string; isActive: boolean }): Promise<Result> {
  const auth = await authorizePermission("content.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("testimonials").update({ is_active: input.isActive }).eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function deleteTestimonialAction(input: { id: string }): Promise<Result> {
  const auth = await authorizePermission("content.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("testimonials").delete().eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível remover: ${error.message}` };
  revalidatePath("/admin/depoimentos");
  revalidatePath("/");
  return { ok: true, data: undefined };
}
