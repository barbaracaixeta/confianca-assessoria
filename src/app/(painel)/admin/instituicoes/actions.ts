"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizePermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome.").max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug inválido: use letras minúsculas e hífens."),
  description: z.string().trim().max(240).nullable(),
  logoPath: z.string().trim().max(500).nullable(),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

function revalidateInstitution(slug: string) {
  revalidatePath("/");
  revalidatePath("/loja");
  revalidatePath("/instituicoes");
  revalidatePath(`/instituicoes/${slug}`);
  revalidatePath("/admin/instituicoes");
}

export async function saveInstitutionAction(input: z.infer<typeof schema>): Promise<Result<{ id: string }>> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const data = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description || null,
    logo_path: parsed.data.logoPath || null,
    sort_order: parsed.data.sortOrder,
    is_active: parsed.data.isActive,
  };

  if (parsed.data.id) {
    const { data: updated, error } = await admin.from("institutions").update(data).eq("id", parsed.data.id).select("id").single();
    if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };
    revalidateInstitution(parsed.data.slug);
    return { ok: true, data: { id: updated.id } };
  }

  const { data: created, error } = await admin.from("institutions").insert(data).select("id").single();
  if (error) return { ok: false, error: `Não foi possível criar: ${error.message}` };
  revalidateInstitution(parsed.data.slug);
  return { ok: true, data: { id: created.id } };
}

export async function toggleInstitutionAction(input: { id: string; isActive: boolean; slug: string }): Promise<Result> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("institutions").update({ is_active: input.isActive }).eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };
  revalidateInstitution(input.slug);
  return { ok: true, data: undefined };
}

export async function deleteInstitutionAction(input: { id: string; slug: string }): Promise<Result> {
  const auth = await authorizePermission("products.delete");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { count } = await admin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("institution_id", input.id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: `Esta instituição tem ${count} produto(s) vinculado(s). Reatribua ou remova o vínculo antes de excluir.` };
  }

  const { error } = await admin.from("institutions").delete().eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível remover: ${error.message}` };
  revalidateInstitution(input.slug);
  return { ok: true, data: undefined };
}
