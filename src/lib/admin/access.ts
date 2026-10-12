import "server-only";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { requireRole, hasPermission, type SessionUser } from "@/lib/auth/session";
import { ALL_PERMISSIONS, type Permission } from "@/lib/admin/permissions";
import type { AppRole } from "@/types/domain";

export type AdminSession = SessionUser & { preview: boolean };

/**
 * Acesso ao painel. Em desenvolvimento SEM Supabase, libera uma prévia com dados
 * fictícios sinalizados — em produção, ou com Supabase configurado, exige o papel.
 * Quem está obrigado a trocar a senha temporária (primeiro acesso) só pode
 * permanecer em /admin/alterar-senha; qualquer outra área do painel redireciona.
 */
export async function requireAdminArea(minimum: AppRole = "operator"): Promise<AdminSession> {
  if (!isSupabaseConfigured && process.env.NODE_ENV !== "production") {
    return {
      id: "preview",
      email: "previa@local",
      fullName: "Prévia local",
      role: "super_admin",
      permissions: ALL_PERMISSIONS,
      mustChangePassword: false,
      lastLoginAt: null,
      preview: true,
    };
  }
  const user = await requireRole(minimum, "/admin");
  if (user.mustChangePassword) redirect("/admin/alterar-senha");
  return { ...user, preview: false };
}

/** Garante acesso ao painel + uma permissão granular (Server Components). */
export async function requireAdminPermission(permission: Permission, minimum: AppRole = "operator"): Promise<AdminSession> {
  const area = await requireAdminArea(minimum);
  if (area.preview) return area;
  if (!hasPermission(area, permission)) redirect("/acesso-negado");
  return area;
}

/**
 * Sessão de quem ainda precisa trocar a senha temporária: exige login e vínculo
 * com a equipe, mas NÃO dispara o redirecionamento de troca de senha. Usada
 * somente em /admin/alterar-senha.
 */
export async function requireAdminSessionForPasswordChange(): Promise<AdminSession> {
  if (!isSupabaseConfigured && process.env.NODE_ENV !== "production") {
    return {
      id: "preview",
      email: "previa@local",
      fullName: "Prévia local",
      role: "super_admin",
      permissions: ALL_PERMISSIONS,
      mustChangePassword: false,
      lastLoginAt: null,
      preview: true,
    };
  }
  const user = await requireRole("operator", "/admin/alterar-senha");
  return { ...user, preview: false };
}