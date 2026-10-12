import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { requireRole, type SessionUser } from "@/lib/auth/session";
import type { AppRole } from "@/types/domain";

/**
 * Acesso ao painel. Em desenvolvimento SEM Supabase, libera uma prévia com dados
 * fictícios sinalizados — em produção, ou com Supabase configurado, exige o papel.
 */
export async function requireAdminArea(minimum: AppRole = "operator"): Promise<SessionUser & { preview: boolean }> {
  if (!isSupabaseConfigured && process.env.NODE_ENV !== "production") {
    return { id: "preview", email: "previa@local", fullName: "Prévia local", role: "super_admin", preview: true };
  }
  const user = await requireRole(minimum, "/admin");
  return { ...user, preview: false };
}
