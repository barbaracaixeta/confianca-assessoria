-- =====================================================================
-- Acesso administrativo: permissões granulares, troca de senha no primeiro
-- acesso e registro do último login. Estende `profiles` (não duplica tabelas).
-- Credenciais continuam exclusivas do Supabase Auth.
-- =====================================================================

alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists last_login_at timestamptz,
  add column if not exists permissions text[];

-- Índice para listar a equipe e contar Super Admins ativos
create index if not exists profiles_staff_idx
  on public.profiles (role, created_at desc)
  where role <> 'customer';

-- Registra o último login tornando o `last_sign_in_at` do Auth visível no perfil
create or replace function public.touch_profile_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set last_login_at = new.last_sign_in_at where id = new.id;
  return new;
end;
$$;

drop trigger if exists profiles_touch_login on auth.users;
create trigger profiles_touch_login after update of last_sign_in_at on auth.users
  for each row execute function public.touch_profile_login();

-- Auditoria também cobre permissões e a obrigação de trocar a senha
drop trigger if exists audit_profiles_role on public.profiles;
create trigger audit_profiles_role
  after update of role, is_active, permissions, must_change_password on public.profiles
  for each row execute function public.audit_row_change();

-- Fecha a brecha de auto-promoção: o dono do perfil lia/atualizava a própria
-- linha via RLS, mas não podia mudar papel/status. Agora permissões e a marca de
-- primeiro acesso também só mudam por Super Admin ou pelo service role
-- (auth.uid() nulo nas Server Actions administrativas).
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active
      or new.email is distinct from old.email
      or new.permissions is distinct from old.permissions
      or new.must_change_password is distinct from old.must_change_password)
     and auth.uid() is not null
     and not public.is_super_admin() then
    raise exception 'Somente SUPER_ADMIN pode alterar papel, status, permissões ou e-mail do perfil';
  end if;
  return new;
end;
$$;