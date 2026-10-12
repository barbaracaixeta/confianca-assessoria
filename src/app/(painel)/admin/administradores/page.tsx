import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin/access";
import { hasPermission } from "@/lib/auth/session";
import { getAdminStaff, getCurrentStaffId } from "@/lib/admin/staff";
import { StaffManager } from "./staff-manager";

export const metadata: Metadata = { title: "Administradores" };
export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const viewer = await requireAdminPermission("admins.view");
  const [staff, currentStaffId] = await Promise.all([getAdminStaff(), getCurrentStaffId()]);
  return (
    <div>
      <h1 className="display text-[2.7rem] text-pine">Administradores</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Defina quem acessa o painel, o perfil de permissões e a situação de cada conta. Novos acessos recebem uma senha temporária e a trocam no primeiro login.
      </p>
      <StaffManager
        initial={staff}
        currentStaffId={currentStaffId}
        canCreate={hasPermission(viewer, "admins.create")}
        canEdit={hasPermission(viewer, "admins.edit")}
        canDelete={hasPermission(viewer, "admins.delete")}
        canManageSuperAdmin={viewer.role === "super_admin"}
      />
    </div>
  );
}