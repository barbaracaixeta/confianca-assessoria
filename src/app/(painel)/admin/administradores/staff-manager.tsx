"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { formatDate } from "@/lib/utils";
import { PROFILE_PRESET_LABEL } from "@/lib/admin/permissions";
import type { AdminStaffRow } from "@/lib/admin/staff";
import type { AppRole } from "@/types/domain";
import { AdminFormModal, type AdminFormValues } from "./admin-form-modal";
import { TempPasswordModal } from "./temp-password-modal";
import {
  createAdminAction,
  deleteAdminAction,
  resetAdminPasswordAction,
  setAdminActiveAction,
  updateAdminAction,
} from "./actions";

const ROLE_LABEL: Record<AppRole, string> = {
  customer: "Cliente",
  operator: "Operador",
  admin: "Administrador",
  super_admin: "Super Admin",
};

function profileLabel(row: AdminStaffRow): string {
  if (row.custom) return PROFILE_PRESET_LABEL.custom;
  return ROLE_LABEL[row.role];
}

export function StaffManager({
  initial,
  currentStaffId,
  canCreate,
  canEdit,
  canDelete,
  canManageSuperAdmin,
}: {
  initial: AdminStaffRow[];
  currentStaffId: string | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageSuperAdmin: boolean;
}) {
  const router = useRouter();
  const rows = initial;
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<{ open: boolean; mode: "create" | "edit"; row?: AdminStaffRow | null }>({ open: false, mode: "create" });
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [temp, setTemp] = useState<{ open: boolean; email: string; password: string }>({ open: false, email: "", password: "" });

  function openCreate() {
    setFormError(null);
    setForm({ open: true, mode: "create", row: null });
  }
  function openEdit(row: AdminStaffRow) {
    setFormError(null);
    setForm({ open: true, mode: "edit", row });
  }
  function closeForm() {
    setForm((f) => ({ ...f, open: false }));
  }

  async function submitForm(values: AdminFormValues) {
    setFormBusy(true);
    setFormError(null);
    if (form.mode === "create") {
      const res = await createAdminAction({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        role: values.role,
        preset: values.preset,
        permissions: values.permissions,
      });
      setFormBusy(false);
      if (!res.ok) return setFormError(res.error);
      setTemp({ open: true, email: values.email, password: res.data.temporaryPassword });
      closeForm();
      router.refresh();
      return;
    }
    const res = await updateAdminAction({
      profileId: form.row!.id,
      fullName: values.fullName,
      phone: values.phone,
      role: values.role,
      preset: values.preset,
      permissions: values.permissions,
    });
    setFormBusy(false);
    if (!res.ok) return setFormError(res.error);
    closeForm();
    router.refresh();
  }

  async function toggleActive(row: AdminStaffRow, isActive: boolean) {
    setError(null);
    setBusyId(row.id);
    const res = await setAdminActiveAction({ profileId: row.id, isActive });
    setBusyId(null);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  async function resetPassword(row: AdminStaffRow) {
    setError(null);
    setBusyId(row.id);
    const res = await resetAdminPasswordAction({ profileId: row.id });
    setBusyId(null);
    if (!res.ok) return setError(res.error);
    setTemp({ open: true, email: row.email, password: res.data.temporaryPassword });
    router.refresh();
  }

  async function remove(row: AdminStaffRow) {
    if (!confirm(`Excluir o acesso de ${row.fullName || row.email}? Esta ação não pode ser desfeita.`)) return;
    setError(null);
    setBusyId(row.id);
    const res = await deleteAdminAction({ profileId: row.id });
    setBusyId(null);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="mt-8 max-w-[1040px]">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">{rows.length} {rows.length === 1 ? "acesso" : "acessos"}</p>
        {canCreate && <Button onClick={openCreate}>Adicionar administrador</Button>}
      </div>

      {error && <p className="mt-4 text-sm font-medium text-danger" role="alert">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="pb-2 font-normal">Pessoa</th>
              <th className="pb-2 font-normal">Perfil</th>
              <th className="pb-2 font-normal">Último acesso</th>
              <th className="pb-2 font-normal">Situação</th>
              <th className="pb-2 font-normal text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const self = r.id === currentStaffId;
              const busy = busyId === r.id;
              return (
                <tr key={r.id} className="border-b border-line align-top last:border-0">
                  <td className="py-3 pr-4">
                    <span className="font-medium text-ink">{r.fullName || "Sem nome"}</span>
                    {self && <Badge className="ml-2">você</Badge>}
                    <span className="block text-xs text-muted">{r.email}{r.phone ? ` · ${r.phone}` : ""}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-ink-2">{profileLabel(r)}</span>
                    {r.custom && <Badge className="ml-2">{r.permissions.length} permissões</Badge>}
                  </td>
                  <td className="py-3 pr-4">
                    {r.mustChangePassword ? (
                      <Badge tone="amber">Aguardando primeiro acesso</Badge>
                    ) : r.lastLoginAt ? (
                      <span className="text-ink-2">{formatDate(r.lastLoginAt, { dateStyle: "short", timeStyle: "short" })}</span>
                    ) : (
                      <span className="text-muted">Nunca acessou</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge tone={r.isActive ? "green" : "danger"}>{r.isActive ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {canEdit && !self && (
                        <>
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => openEdit(r)}>Editar</Button>
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void toggleActive(r, !r.isActive)}>
                            {r.isActive ? "Desativar" : "Ativar"}
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void resetPassword(r)}>Resetar senha</Button>
                        </>
                      )}
                      {canDelete && !self && (
                        <>
                          {canEdit && <span className="mx-0.5 h-5 w-px bg-line" aria-hidden="true" />}
                          <Button
                            size="sm"
                            variant="dangerOutline"
                            disabled={busy}
                            onClick={() => void remove(r)}
                            aria-label={`Excluir o acesso de ${r.fullName || r.email}`}
                          >
                            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                              <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                            </svg>
                            Excluir
                          </Button>
                        </>
                      )}
                      {self && <span className="text-xs text-muted">Edite seus dados na loja</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-sm text-muted">Nenhum perfil cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-xs text-muted">
        O Super Admin mantém acesso total. Perfis predefinidos derivam as permissões do papel; o Personalizado usa a lista escolhida. A última conta de Super Admin ativa não pode ser removida, desativada ou rebaixada.
      </p>

      <AdminFormModal
        key={`${form.mode}:${form.row?.id ?? "new"}:${form.open ? "open" : "closed"}`}
        open={form.open}
        mode={form.mode}
        row={form.row}
        canManageSuperAdmin={canManageSuperAdmin}
        busy={formBusy}
        error={formError}
        onClose={closeForm}
        onSubmit={submitForm}
      />

      <TempPasswordModal
        open={temp.open}
        email={temp.email}
        password={temp.password}
        onClose={() => setTemp((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}