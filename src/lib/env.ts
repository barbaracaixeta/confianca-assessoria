import { z } from "zod";

/**
 * Variáveis públicas (seguras para o navegador). Valores de servidor ficam em env.server.ts.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
});

/**
 * Sem Supabase configurado o site roda em modo demonstração: o catálogo usa dados
 * mockados e qualquer operação que grava dados informa claramente que o backend
 * precisa ser configurado (nada é simulado como se tivesse funcionado).
 */
export const isSupabaseConfigured = Boolean(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/**
 * URL pública canônica do site (links de e-mail, SEO, retorno de auth).
 * Ordem: `NEXT_PUBLIC_APP_URL` → domínio de produção da Vercel → domínio do
 * deploy atual → localhost. Isso evita gerar links com `localhost` em produção
 * quando a variável não está definida no projeto da Vercel.
 */
function resolveAppUrl(): string {
  const explicit = publicEnv.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export const appUrl = resolveAppUrl();
