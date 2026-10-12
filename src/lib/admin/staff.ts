import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { effectivePermissions, PRESET_PERMISSIONS, type Permission } from "@/lib/admin/permissions";
import type { AppRole } from "@/types/domain";

export interface AdminStaffRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  cpfCnpj: string | null;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  permissions: Permission[];
  /** true quando o perfil usa permissões explícitas (Personalizado). */
  custom: boolean;
}

function toRow(p: {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf_cnpj: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  must_change_password: boolean;
  last_login_at: string | null;
  permissions: string[] | null;
}): AdminStaffRow {
  const custom = p.role !== "super_admin" && Array.isArray(p.permissions) && p.permissions.length > 0;
  return {
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    phone: p.phone,
    cpfCnpj: p.cpf_cnpj,
    role: p.role,
    isActive: p.is_active,
    createdAt: p.created_at,
    mustChangePassword: p.must_change_password,
    lastLoginAt: p.last_login_at,
    permissions: effectivePermissions(p.role, p.permissions),
    custom,
  };
}

const STAFF_COLUMNS = "id, full_name, email, phone, cpf_cnpj, role, is_active, created_at, must_change_password, last_login_at, permissions";

/** Toda a equipe (não-clientes), mais recentes e de maior papel primeiro. */
export async function getAdminStaff(): Promise<AdminStaffRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("profiles")
    .select(STAFF_COLUMNS)
    .neq("role", "customer")
    .order("role", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map(toRow);
}

/** Quantidade de Super Admins ativos — protege contra remover o último acesso. */
export async function countActiveSuperAdmins(excludeId?: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  if (!admin) return 0;
  let query = admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("is_active", true);
  if (excludeId) query = query.neq("id", excludeId);
  const { count } = await query;
  return count ?? 0;
}

export async function getCurrentStaffId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export { PRESET_PERMISSIONS };