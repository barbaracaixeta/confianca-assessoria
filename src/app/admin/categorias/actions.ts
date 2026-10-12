"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome.").max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug inválido: use letras minúsculas e hífens."),
  description: z.string().trim().max(240).nullable(),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

export async function saveCategoryAction(input: z.infer<typeof schema>): Promise<Result<{ id: string }>> {
  const auth = await authorize("operator");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const data = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description || null,
    sort_order: parsed.data.sortOrder,
    is_active: parsed.data.isActive,
  };

  if (parsed.data.id) {
    const { data: updated, error } = await admin.from("categories").update(data).eq("id", parsed.data.id).select("id").single();
    if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };
    revalidatePath(`/categoria/${parsed.data.slug}`);
    return { ok: true, data: { id: updated.id } };
  }

  const { data: created, error } = await admin.from("categories").insert(data).select("id").single();
  if (error) return { ok: false, error: `Não foi possível criar: ${error.message}` };
  revalidatePath("/loja");
  revalidatePath("/admin/categorias");
  return { ok: true, data: { id: created.id } };
}

export async function toggleCategoryAction(input: { id: string; isActive: boolean; slug: string }): Promise<Result> {
  const auth = await authorize("operator");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("categories").update({ is_active: input.isActive }).eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };
  revalidatePath(`/categoria/${input.slug}`);
  revalidatePath("/loja");
  revalidatePath("/admin/categorias");
  return { ok: true, data: undefined };
}

export async function deleteCategoryAction(input: { id: string; slug: string }): Promise<Result> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("categories").delete().eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível remover: ${error.message}` };
  revalidatePath(`/categoria/${input.slug}`);
  revalidatePath("/loja");
  revalidatePath("/admin/categorias");
  return { ok: true, data: undefined };
}