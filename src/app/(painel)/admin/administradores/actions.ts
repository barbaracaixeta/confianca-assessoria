"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizePermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { countActiveSuperAdmins } from "@/lib/admin/staff";
import {
  ALL_PERMISSIONS,
  PERMISSION_IDS,
  PRESET_PERMISSIONS,
  clampPermissions,
  type Permission,
} from "@/lib/admin/permissions";
import { generateTemporaryPassword } from "@/lib/security/password";
import type { AppRole } from "@/types/domain";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const STAFF_ROLES = ["operator", "admin", "super_admin"] as const;
const permissionSchema = z.enum(PERMISSION_IDS);

const createSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome completo."),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  role: z.enum(STAFF_ROLES),
  preset: z.enum(["super_admin", "admin", "operator", "custom"]),
  permissions: z.array(permissionSchema).default([]),
});

const updateSchema = z.object({
  profileId: z.string().uuid(),
  fullName: z.string().trim().min(2, "Informe o nome completo."),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  role: z.enum(STAFF_ROLES),
  preset: z.enum(["super_admin", "admin", "operator", "custom"]),
  permissions: z.array(permissionSchema).default([]),
});

const idSchema = z.object({ profileId: z.string().uuid() });
const activeSchema = z.object({ profileId: z.string().uuid(), isActive: z.boolean() });

const DB_OFF = "Banco de dados não configurado.";

/** Resolve a lista explícita de permissões a persistir (null = derivar do papel). */
function resolvePermissions(role: AppRole, preset: z.infer<typeof createSchema>["preset"], requested: Permission[]): Permission[] | null {
  if (role === "super_admin") return null;
  if (preset !== "custom") return null; // predefinido → derivado do papel
  return requested;
}

/** Impede conceder o que o próprio autor não possui (exceto Super Admin). */
function grantedPermissions(author: { role: AppRole; permissions: Permission[] }, role: AppRole, explicit: Permission[] | null): Permission[] {
  if (author.role === "super_admin") {
    return explicit ?? (role !== "customer" ? PRESET_PERMISSIONS[role] : ALL_PERMISSIONS);
  }
  return clampPermissions(explicit ?? (role !== "customer" ? PRESET_PERMISSIONS[role] : []), author.permissions);
}

export async function createAdminAction(input: z.infer<typeof createSchema>): Promise<Result<{ id: string; temporaryPassword: string }>> {
  const auth = await authorizePermission("admins.create");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { fullName, email, phone, role, preset } = parsed.data;

  if (role === "super_admin" && auth.user.role !== "super_admin") {
    return { ok: false, error: "Apenas um Super Admin pode criar outro Super Admin." };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: DB_OFF };

  const temporaryPassword = generateTemporaryPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone: phone || null },
  });
  if (createError || !created.user) {
    const msg = createError?.message.includes("already") ? "Já existe uma conta com este e-mail." : "Não foi possível criar a conta.";
    return { ok: false, error: msg };
  }

  const explicit = resolvePermissions(role, preset, parsed.data.permissions);
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      role,
      full_name: fullName,
      phone: phone || null,
      is_active: true,
      must_change_password: true,
      permissions: explicit,
    })
    .eq("id", created.user.id);
  if (updateError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Não foi possível configurar o acesso: ${updateError.message}` };
  }

  revalidatePath("/admin/administradores");
  return { ok: true, data: { id: created.user.id, temporaryPassword } };
}

export async function updateAdminAction(input: z.infer<typeof updateSchema>): Promise<Result> {
  const auth = await authorizePermission("admins.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { profileId, fullName, phone, role, preset } = parsed.data;

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: DB_OFF };

  const { data: target } = await admin.from("profiles").select("role, is_active").eq("id", profileId).maybeSingle();
  if (!target) return { ok: false, error: "Perfil não encontrado." };

  if (profileId === auth.user.id && role !== auth.user.role) {
    return { ok: false, error: "Você não pode alterar o próprio papel." };
  }
  if (role === "super_admin" && auth.user.role !== "super_admin") {
    return { ok: false, error: "Apenas um Super Admin pode promover alguém a Super Admin." };
  }
  // Protege o último Super Admin ativo de perder o papel.
  if (target.role === "super_admin" && role !== "super_admin" && target.is_active) {
    if ((await countActiveSuperAdmins(profileId)) === 0) {
      return { ok: false, error: "Este é o único Super Admin ativo. Promova outro antes de alterar este papel." };
    }
  }

  const explicit = resolvePermissions(role, preset, parsed.data.permissions);
  if (explicit && auth.user.role !== "super_admin" && explicit.some((p) => !grantedPermissions(auth.user, role, explicit).includes(p))) {
    return { ok: false, error: "Você não pode conceder permissões que você mesmo não possui." };
  }

  const { error } = await admin
    .from("profiles")
    .update({ role, full_name: fullName, phone: phone || null, permissions: explicit })
    .eq("id", profileId);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };

  revalidatePath("/admin/administradores");
  return { ok: true, data: undefined };
}

export async function setAdminActiveAction(input: z.infer<typeof activeSchema>): Promise<Result> {
  const auth = await authorizePermission("admins.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = activeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.profileId === auth.user.id) return { ok: false, error: "Você não pode desativar a própria conta." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: DB_OFF };

  if (!parsed.data.isActive) {
    const { data: target } = await admin.from("profiles").select("role").eq("id", parsed.data.profileId).maybeSingle();
    if (target?.role === "super_admin" && (await countActiveSuperAdmins(parsed.data.profileId)) === 0) {
      return { ok: false, error: "Este é o único Super Admin ativo. Não é possível desativá-lo." };
    }
  }

  const { error } = await admin.from("profiles").update({ is_active: parsed.data.isActive }).eq("id", parsed.data.profileId);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };

  revalidatePath("/admin/administradores");
  return { ok: true, data: undefined };
}

export async function resetAdminPasswordAction(input: z.infer<typeof idSchema>): Promise<Result<{ temporaryPassword: string }>> {
  const auth = await authorizePermission("admins.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.profileId === auth.user.id) return { ok: false, error: "Use “Alterar minha senha” para a própria conta." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: DB_OFF };

  const temporaryPassword = generateTemporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.profileId, { password: temporaryPassword });
  if (error) return { ok: false, error: "Não foi possível gerar a nova senha." };

  await admin.from("profiles").update({ must_change_password: true }).eq("id", parsed.data.profileId);

  revalidatePath("/admin/administradores");
  return { ok: true, data: { temporaryPassword } };
}

export async function deleteAdminAction(input: z.infer<typeof idSchema>): Promise<Result> {
  const auth = await authorizePermission("admins.delete");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.profileId === auth.user.id) return { ok: false, error: "Você não pode excluir a própria conta." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: DB_OFF };

  const { data: target } = await admin.from("profiles").select("role").eq("id", parsed.data.profileId).maybeSingle();
  if (!target) return { ok: false, error: "Perfil não encontrado." };
  if (target.role === "super_admin" && (await countActiveSuperAdmins(parsed.data.profileId)) === 0) {
    return { ok: false, error: "Este é o único Super Admin ativo. Não é possível excluí-lo." };
  }

  const { error } = await admin.auth.admin.deleteUser(parsed.data.profileId);
  if (error) return { ok: false, error: "Não foi possível excluir o acesso." };

  revalidatePath("/admin/administradores");
  return { ok: true, data: undefined };
}