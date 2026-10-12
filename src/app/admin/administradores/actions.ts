"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true; data: undefined } | { ok: false; error: string };

const roleSchema = z.object({ profileId: z.string().uuid(), role: z.enum(["customer", "operator", "admin", "super_admin"]) });
const activeSchema = z.object({ profileId: z.string().uuid(), isActive: z.boolean() });

export async function updateStaffRoleAction(input: z.infer<typeof roleSchema>): Promise<Result> {
  const auth = await authorize("super_admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.profileId === auth.user.id) {
    return { ok: false, error: "Você não pode alterar o próprio papel." };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { error } = await admin.from("profiles").update({ role: parsed.data.role }).eq("id", parsed.data.profileId);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };

  revalidatePath("/admin/administradores");
  return { ok: true, data: undefined };
}

export async function toggleStaffActiveAction(input: z.infer<typeof activeSchema>): Promise<Result> {
  const auth = await authorize("super_admin");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = activeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.profileId === auth.user.id) {
    return { ok: false, error: "Você não pode desativar a própria conta." };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { error } = await admin.from("profiles").update({ is_active: parsed.data.isActive }).eq("id", parsed.data.profileId);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };

  revalidatePath("/admin/administradores");
  return { ok: true, data: undefined };
}
