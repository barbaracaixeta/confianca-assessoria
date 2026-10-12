"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import { changeAdminPasswordAction, type ChangePasswordState } from "./actions";

const REQUIREMENTS = [
  { id: "len", label: "Pelo menos 10 caracteres", test: (v: string) => v.length >= 10 },
  { id: "upper", label: "Uma letra maiúscula", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "Uma letra minúscula", test: (v: string) => /[a-z]/.test(v) },
  { id: "num", label: "Um número", test: (v: string) => /[0-9]/.test(v) },
  { id: "special", label: "Um caractere especial", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changeAdminPasswordAction, {});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const allValid = REQUIREMENTS.every((r) => r.test(password));
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="danger" role="alert">{state.error}</Alert>}

      <Field label="Nova senha">
        {(p) => (
          <Input
            {...p}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>

      <Field label="Confirmar nova senha" error={mismatch ? "As senhas não coincidem." : undefined}>
        {(p) => (
          <Input
            {...p}
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={mismatch || undefined}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
      </Field>

      <ul className="space-y-1.5 rounded-[var(--radius-sm)] bg-paper p-4" aria-label="Requisitos da senha">
        {REQUIREMENTS.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.id} className="flex items-center gap-2 text-sm" aria-live="polite">
              <svg viewBox="0 0 24 24" className={cn("size-4 shrink-0", ok ? "text-green" : "text-muted/50")} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                {ok ? <path d="M20 6 9 17l-5-5" /> : <circle cx="12" cy="12" r="8" />}
              </svg>
              <span className={ok ? "text-ink-2" : "text-muted"}>{r.label}</span>
            </li>
          );
        })}
      </ul>

      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!allValid || mismatch}>
        Criar nova senha
      </Button>
    </form>
  );
}