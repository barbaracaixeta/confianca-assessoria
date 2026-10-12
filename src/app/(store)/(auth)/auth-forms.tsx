"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AuthState,
} from "./actions";

export function SignInForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {linkError && !state.error && <Alert tone="amber">O link expirou ou já foi usado. Entre com sua senha ou solicite um novo.</Alert>}
      {state.error && <Alert tone="danger" role="alert">{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail">{(p) => <Input {...p} name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} required />}</Field>
      <Field label="Senha">{(p) => <Input {...p} name="password" type="password" autoComplete="current-password" required />}</Field>
      <div className="flex items-center justify-between">
        <Link href="/esqueci-senha" className="text-sm text-pine underline-offset-2 hover:underline">Esqueci minha senha</Link>
        <Button type="submit" size="lg" loading={pending}>Entrar</Button>
      </div>
    </form>
  );
}

export function SignUpForm({ next, email }: { next: string; email?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, {});
  if (state.message) return <Alert tone="green" title="Confira seu e-mail" role="status">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="danger" role="alert">{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <Field label="Nome completo">{(p) => <Input {...p} name="fullName" autoComplete="name" defaultValue={state.fields?.fullName} required />}</Field>
      <Field label="E-mail" hint="Use o mesmo e-mail da compra para ver seus pedidos.">
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" defaultValue={state.fields?.email ?? email} required />}
      </Field>
      <Field label="Senha" hint="Mínimo de 8 caracteres, com letras e números.">
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" minLength={8} required />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Criar conta</Button>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordResetAction, {});
  if (state.message) return <Alert tone="green" role="status">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="danger" role="alert">{state.error}</Alert>}
      <Field label="E-mail da conta">{(p) => <Input {...p} name="email" type="email" autoComplete="email" required />}</Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Enviar link</Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePasswordAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="danger" role="alert">{state.error}</Alert>}
      <Field label="Nova senha" hint="Mínimo de 8 caracteres, com letras e números.">
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" required />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Salvar nova senha</Button>
    </form>
  );
}
