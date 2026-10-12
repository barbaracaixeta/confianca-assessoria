"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import {
  PERMISSION_GROUPS,
  PRESET_PERMISSIONS,
  PROFILE_PRESET_LABEL,
  type AdminProfilePreset,
  type Permission,
} from "@/lib/admin/permissions";
import type { AdminStaffRow } from "@/lib/admin/staff";
import type { AppRole } from "@/types/domain";

const PRESETS: AdminProfilePreset[] = ["super_admin", "admin", "operator", "custom"];
const PRESET_HINT: Record<AdminProfilePreset, string> = {
  super_admin: "Acesso total, incluindo administradores e configurações.",
  admin: "Quase tudo, exceto gerenciar administradores e editar configurações.",
  operator: "Operação do dia a dia: catálogo, pedidos e clientes (leitura).",
  custom: "Escolha manualmente cada permissão abaixo.",
};

export interface AdminFormValues {
  fullName: string;
  email: string;
  phone: string;
  role: Exclude<AppRole, "customer">;
  preset: AdminProfilePreset;
  permissions: Permission[];
}

export function AdminFormModal({
  open,
  mode,
  row,
  canManageSuperAdmin,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  row?: AdminStaffRow | null;
  canManageSuperAdmin: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: AdminFormValues) => void;
}) {
  const initial = useMemo<AdminFormValues>(() => {
    if (mode === "edit" && row) {
      return {
        fullName: row.fullName,
        email: row.email,
        phone: row.phone ?? "",
        role: row.role === "customer" ? "operator" : row.role,
        preset: row.custom ? "custom" : (row.role as AdminProfilePreset),
        permissions: row.permissions,
      };
    }
    return { fullName: "", email: "", phone: "", role: "operator", preset: "operator", permissions: [...PRESET_PERMISSIONS.operator] };
  }, [mode, row]);

  const [values, setValues] = useState<AdminFormValues>(initial);

  function set<K extends keyof AdminFormValues>(key: K, value: AdminFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function choosePreset(preset: AdminProfilePreset) {
    const role: AdminFormValues["role"] = preset === "custom" ? values.role : preset;
    const permissions =
      preset === "custom" ? values.permissions : preset === "super_admin" ? [] : [...PRESET_PERMISSIONS[preset]];
    setValues((v) => ({ ...v, preset, role, permissions }));
  }

  function togglePermission(id: Permission) {
    setValues((v) => ({
      ...v,
      preset: "custom",
      permissions: v.permissions.includes(id) ? v.permissions.filter((p) => p !== id) : [...v.permissions, id],
    }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Novo administrador" : "Editar administrador"}
      description={mode === "create" ? "A pessoa receberá uma senha temporária e deverá trocá-la no primeiro acesso." : undefined}
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="button" loading={busy} onClick={() => onSubmit(values)}>
            {mode === "create" ? "Criar acesso" : "Salvar alterações"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo">{(p) => <Input {...p} value={values.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="off" />}</Field>
          <Field label="Telefone" optional>{(p) => <Input {...p} value={values.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="off" />}</Field>
        </div>

        <Field label="E-mail" hint={mode === "edit" ? "O e-mail de acesso não muda por aqui." : undefined}>
          {(p) => (
            <Input {...p} type="email" value={values.email} disabled={mode === "edit"} onChange={(e) => set("email", e.target.value)} autoComplete="off" />
          )}
        </Field>

        <div>
          <p className="text-sm font-medium text-ink">Perfil de acesso</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {PRESETS.filter((p) => p !== "super_admin" || canManageSuperAdmin).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => choosePreset(preset)}
                aria-pressed={values.preset === preset}
                className={cn(
                  "rounded-[var(--radius-sm)] border px-3.5 py-3 text-left transition-colors",
                  values.preset === preset ? "border-pine bg-green-50" : "border-line hover:border-ink-2/40",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  {PROFILE_PRESET_LABEL[preset]}
                  {values.preset === preset && <Badge tone="green">selecionado</Badge>}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{PRESET_HINT[preset]}</span>
              </button>
            ))}
          </div>
        </div>

        {values.preset === "custom" && (
          <div className="space-y-4 rounded-[var(--radius-sm)] border border-line p-4">
            {PERMISSION_GROUPS.map((group) => (
              <fieldset key={group.title}>
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted">{group.title}</legend>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {group.items.map((item) => (
                    <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-pine"
                        checked={values.permissions.includes(item.id)}
                        onChange={() => togglePermission(item.id)}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}