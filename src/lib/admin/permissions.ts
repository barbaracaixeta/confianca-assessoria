/**
 * Permissões granulares do painel administrativo.
 *
 * A autorização é verificada SEMPRE no servidor (Server Actions, páginas e
 * proxy). O menu e os botões apenas escondem o que o usuário não pode acessar —
 * nunca substituem a checagem.
 *
 * Modelo:
 *  - perfis predefinidos (Super Admin / Administrador / Operador) derivam seu
 *    conjunto de permissões do papel;
 *  - um perfil "Personalizado" guarda a lista explícita em `profiles.permissions`;
 *  - Super Admin sempre possui todas as permissões.
 */

export const PERMISSION_IDS = [
  "dashboard.view",
  "products.view",
  "products.create",
  "products.edit",
  "products.delete",
  "orders.view",
  "orders.edit",
  "customers.view",
  "customers.edit",
  "files.view",
  "files.upload",
  "files.delete",
  "admins.view",
  "admins.create",
  "admins.edit",
  "admins.delete",
  "settings.view",
  "settings.edit",
  "content.view",
  "content.edit",
] as const;

export type Permission = (typeof PERMISSION_IDS)[number];

export const ALL_PERMISSIONS: Permission[] = [...PERMISSION_IDS];

export type AdminProfilePreset = "super_admin" | "admin" | "operator" | "custom";

export const PRESET_PERMISSIONS: Record<Exclude<AdminProfilePreset, "custom">, Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: [
    "dashboard.view",
    "products.view",
    "products.create",
    "products.edit",
    "products.delete",
    "orders.view",
    "orders.edit",
    "customers.view",
    "customers.edit",
    "files.view",
    "files.upload",
    "files.delete",
    "settings.view",
    "content.view",
    "content.edit",
  ],
  operator: [
    "dashboard.view",
    "products.view",
    "products.create",
    "products.edit",
    "orders.view",
    "orders.edit",
    "customers.view",
    "files.view",
    "files.upload",
    "content.view",
  ],
};

/** Rótulos em pt-BR para exibição e para o editor de permissões. */
export const PERMISSION_GROUPS: { title: string; items: { id: Permission; label: string }[] }[] = [
  {
    title: "Dashboard",
    items: [{ id: "dashboard.view", label: "Visualizar dashboard" }],
  },
  {
    title: "Produtos",
    items: [
      { id: "products.view", label: "Visualizar produtos" },
      { id: "products.create", label: "Criar produtos" },
      { id: "products.edit", label: "Editar produtos" },
      { id: "products.delete", label: "Excluir produtos" },
    ],
  },
  {
    title: "Pedidos",
    items: [
      { id: "orders.view", label: "Visualizar pedidos" },
      { id: "orders.edit", label: "Editar pedidos" },
    ],
  },
  {
    title: "Clientes",
    items: [
      { id: "customers.view", label: "Visualizar clientes" },
      { id: "customers.edit", label: "Editar clientes" },
    ],
  },
  {
    title: "Arquivos",
    items: [
      { id: "files.view", label: "Visualizar arquivos" },
      { id: "files.upload", label: "Upload de arquivos" },
      { id: "files.delete", label: "Excluir arquivos" },
    ],
  },
  {
    title: "Administradores",
    items: [
      { id: "admins.view", label: "Visualizar administradores" },
      { id: "admins.create", label: "Criar administradores" },
      { id: "admins.edit", label: "Editar administradores" },
      { id: "admins.delete", label: "Excluir/desativar administradores" },
    ],
  },
  {
    title: "Configurações",
    items: [
      { id: "settings.view", label: "Visualizar configurações" },
      { id: "settings.edit", label: "Editar configurações" },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { id: "content.view", label: "Visualizar conteúdo" },
      { id: "content.edit", label: "Editar conteúdo" },
    ],
  },
];

export function isPermission(value: string): value is Permission {
  return (PERMISSION_IDS as readonly string[]).includes(value);
}

/**
 * Permissões efetivas de um usuário.
 * - Super Admin: sempre todas;
 * - permissões explícitas (perfil Personalizado) substituem a derivação;
 * - senão, deriva do papel.
 */
export function effectivePermissions(role: "customer" | "operator" | "admin" | "super_admin", explicit: string[] | null | undefined): Permission[] {
  if (role === "super_admin") return ALL_PERMISSIONS;
  if (explicit && explicit.length > 0) {
    return [...new Set(explicit.filter(isPermission))];
  }
  if (role === "admin") return PRESET_PERMISSIONS.admin;
  if (role === "operator") return PRESET_PERMISSIONS.operator;
  return [];
}

export function hasPermission(
  user: { role: "customer" | "operator" | "admin" | "super_admin"; permissions?: Permission[]; preview?: boolean },
  permission: Permission,
): boolean {
  if (user.preview) return true;
  if (user.role === "super_admin") return true;
  return (user.permissions ?? []).includes(permission);
}

/** Interseção seguro: só entrega permissões que o concedente também possui. */
export function clampPermissions(requested: readonly string[], grantor: Permission[]): Permission[] {
  const granted = new Set(grantor);
  return [...new Set(requested.filter(isPermission))].filter((p) => granted.has(p));
}

export const PROFILE_PRESET_LABEL: Record<AdminProfilePreset, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  operator: "Operador",
  custom: "Personalizado",
};