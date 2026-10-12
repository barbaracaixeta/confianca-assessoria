import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
}

export async function getAdminStaff(): Promise<AdminStaffRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, email, phone, cpf_cnpj, role, is_active, created_at")
    .order("role", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    phone: p.phone,
    cpfCnpj: p.cpf_cnpj,
    role: p.role as AppRole,
    isActive: p.is_active,
    createdAt: p.created_at,
  }));
}

export async function getCurrentStaffId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
