"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizePermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const toggleSchema = z.object({ id: z.string().uuid(), isActive: z.boolean() });

export async function toggleCustomerActiveAction(input: z.infer<typeof toggleSchema>): Promise<Result> {
  const auth = await authorizePermission("customers.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { error } = await admin.from("customers").update({ is_active: parsed.data.isActive }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${parsed.data.id}`);
  return { ok: true, data: undefined };
}
