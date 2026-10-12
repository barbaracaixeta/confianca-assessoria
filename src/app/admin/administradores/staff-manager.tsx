"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/feedback";
import { Select } from "@/components/ui/field";
import { updateStaffRoleAction, toggleStaffActiveAction } from "./actions";
import type { AdminStaffRow } from "@/lib/admin/staff";
import type { AppRole } from "@/types/domain";

const ROLE_LABEL: Record<AppRole, string> = {
  customer: "Cliente",
  operator: "Operador",
  admin: "Administrador",
  super_admin: "Super admin",
};

const ROLES: AppRole[] = ["customer", "operator", "admin", "super_admin"];

export function StaffManager({ initial, currentStaffId }: { initial: AdminStaffRow[]; currentStaffId: string | null }) {
  const router = useRouter();
  const [rows, setRows] = useState<AdminStaffRow[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function patch(id: string, changes: Partial<AdminStaffRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  }

  async function changeRole(row: AdminStaffRow, role: AppRole) {
    const previous = row.role;
    setError(null);
    setBusyId(row.id);
    patch(row.id, { role });
    const res = await updateStaffRoleAction({ profileId: row.id, role });
    setBusyId(null);
    if (!res.ok) {
      patch(row.id, { role: previous });
      return setError(res.error);
    }
    router.refresh();
  }

  async function toggleActive(row: AdminStaffRow, isActive: boolean) {
    const previous = row.isActive;
    setError(null);
    setBusyId(row.id);
    patch(row.id, { isActive });
    const res = await toggleStaffActiveAction({ profileId: row.id, isActive });
    setBusyId(null);
    if (!res.ok) {
      patch(row.id, { isActive: previous });
      return setError(res.error);
    }
    router.refresh();
  }

  return (
    <div className="mt-8 max-w-[960px] space-y-6">
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="pb-2 font-normal">Pessoa</th>
            <th className="pb-2 font-normal">Papel</th>
            <th className="pb-2 font-normal">Situação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const self = r.id === currentStaffId;
            return (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="py-3">
                  <span className="font-medium text-ink">{r.fullName || "Sem nome"}</span>
                  {self && <Badge className="ml-2">você</Badge>}
                  <span className="block text-xs text-muted">{r.email}{r.phone ? ` · ${r.phone}` : ""}</span>
                </td>
                <td className="py-3">
                  {self ? (
                    <span className="text-ink-2">{ROLE_LABEL[r.role]}</span>
                  ) : (
                    <Select
                      aria-label={`Papel de ${r.fullName || r.email}`}
                      className="h-9 max-w-[180px]"
                      value={r.role}
                      disabled={busyId === r.id}
                      onChange={(e) => void changeRole(r, e.target.value as AppRole)}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                      ))}
                    </Select>
                  )}
                </td>
                <td className="py-3">
                  {self ? (
                    <Badge tone={r.isActive ? "green" : "danger"}>{r.isActive ? "Ativo" : "Inativo"}</Badge>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-pine"
                        checked={r.isActive}
                        disabled={busyId === r.id}
                        onChange={(e) => void toggleActive(r, e.target.checked)}
                      />
                      <span className={r.isActive ? "text-ink-2" : "text-muted"}>{r.isActive ? "Ativo" : "Inativo"}</span>
                    </label>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-sm text-muted">Nenhum perfil cadastrado ainda.</td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="text-xs text-muted">
        Promover um cliente concede acesso gradual ao painel. Papéis de operador ou superiores são protegidos: apenas um super admin altera papéis, situação ou e-mail.
      </p>
    </div>
  );
}
