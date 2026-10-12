import type { Metadata } from "next";
import { requireAdminArea } from "@/lib/admin/access";
import { getAdminStaff, getCurrentStaffId } from "@/lib/admin/staff";
import { StaffManager } from "./staff-manager";

export const metadata: Metadata = { title: "Administradores" };
export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  await requireAdminArea("super_admin");
  const [staff, currentStaffId] = await Promise.all([getAdminStaff(), getCurrentStaffId()]);
  return (
    <div>
      <h1 className="display text-[2.25rem] text-pine">Administradores</h1>
      <p className="mt-1 text-sm text-muted">
        Defina quem acessa o painel. Clientes continuam comprando normalmente; promover alguém concede acesso às áreas internas conforme o papel.
      </p>
      <StaffManager initial={staff} currentStaffId={currentStaffId} />
    </div>
  );
}
