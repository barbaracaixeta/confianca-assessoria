"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const schema = z.object({
  id: z.string().uuid().optional(),
  question: z.string().trim().min(2, "Informe a pergunta.").max(240),
  answer: z.string().trim().min(2, "Informe a resposta.").max(4000),
  category: z.string().trim().min(1).max(40),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

export async function saveFaqAction(input: z.infer<typeof schema>): Promise<Result<{ id: string }>> {
  const auth = await authorize("operator");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const data = {
    question: parsed.data.question,
    answer: parsed.data.answer,
    category: parsed.data.category || "geral",
    sort_order: parsed.data.sortOrder,
    is_active: parsed.data.isActive,
  };

  if (parsed.data.id) {
    const { data: updated, error } = await admin.from("faqs").update(data).eq("id", parsed.data.id).select("id").single();
    if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };
    revalidatePath("/admin/faq");
    revalidatePath("/");
    return { ok: true, data: { id: updated.id } };
  }

  const { data: created, error } = await admin.from("faqs").insert(data).select("id").single();
  if (error) return { ok: false, error: `Não foi possível criar: ${error.message}` };
  revalidatePath("/admin/faq");
  revalidatePath("/");
  return { ok: true, data: { id: created.id } };
}

export async function toggleFaqAction(input: { id: string; isActive: boolean }): Promise<Result> {
  const auth = await authorize("operator");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("faqs").update({ is_active: input.isActive }).eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };
  revalidatePath("/admin/faq");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function deleteFaqAction(input: { id: string }): Promise<Result> {
  const auth = await authorize("admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("faqs").delete().eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível remover: ${error.message}` };
  revalidatePath("/admin/faq");
  revalidatePath("/");
  return { ok: true, data: undefined };
}
