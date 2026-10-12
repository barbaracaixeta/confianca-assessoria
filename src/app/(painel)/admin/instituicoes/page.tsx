import { requireAdminPermission } from "@/lib/admin/access";
import type { Metadata } from "next";
import { getAdminInstitutions } from "@/lib/admin/catalog";
import { InstitutionManager } from "./institution-manager";

export const metadata: Metadata = { title: "Instituições" };
export const dynamic = "force-dynamic";

export default async function AdminInstitutionsPage() {
  await requireAdminPermission("products.view");
  const institutions = await getAdminInstitutions();
  return (
    <div>
      <h1 className="display text-[2.7rem] text-pine">Instituições</h1>
      <p className="mt-1 max-w-[60ch] text-sm text-muted">
        Organize o catálogo por instituição de ensino. A instituição é um filtro independente das categorias e é opcional: produtos sem instituição continuam válidos.
      </p>
      <InstitutionManager initial={institutions} />
    </div>
  );
}
