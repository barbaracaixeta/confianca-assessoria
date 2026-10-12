import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDemoSessionUser } from "@/lib/demo/order-studio";
import { effectivePermissions, hasPermission, type Permission } from "@/lib/admin/permissions";
import type { AppRole } from "@/types/domain";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  /** Permissões efetivas (perfil Personalizado ou derivadas do papel). */
  permissions: Permission[];
  /** Obrigado a trocar a senha temporária antes de usar o painel. */
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

const ROLE_RANK: Record<AppRole, number> = { customer: 0, operator: 1, admin: 2, super_admin: 3 };

export function hasRole(role: AppRole, minimum: AppRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export { hasPermission };

/** Usuário atual validado no servidor (getClaims verifica a assinatura do JWT). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return getDemoSessionUser();

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, permissions, must_change_password, last_login_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    permissions: effectivePermissions(profile.role, profile.permissions),
    mustChangePassword: profile.must_change_password,
    lastLoginAt: profile.last_login_at,
  };
});

export async function requireUser(next = "/minha-conta"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Garante papel mínimo; usado em layouts, páginas e Server Actions administrativas. */
export async function requireRole(minimum: AppRole, next = "/admin"): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!hasRole(user.role, minimum)) redirect("/acesso-negado");
  return user;
}

/** Garante uma permissão granular em páginas/layouts (Server Components). */
export async function requirePermission(permission: Permission, next = "/admin"): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!hasPermission(user, permission)) redirect("/acesso-negado");
  return user;
}

/** Variante para Server Actions: retorna erro em vez de redirecionar. */
export async function authorize(minimum: AppRole): Promise<{ user: SessionUser } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente." };
  if (!hasRole(user.role, minimum)) return { error: "Você não tem permissão para esta ação." };
  return { user };
}

/** Variante de permissão granular para Server Actions. */
export async function authorizePermission(permission: Permission): Promise<{ user: SessionUser } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente." };
  if (!hasPermission(user, permission)) return { error: "Você não possui permissão para realizar esta ação." };
  return { user };
}