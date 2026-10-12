import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * Dados institucionais editáveis no painel (site_settings › public.company).
 * Campos vazios simplesmente não são exibidos — nada é inventado.
 */
const companySchema = z.object({
  name: z.string().default("Confiança Assessoria Acadêmica"),
  email: z.string().email().nullable().default(null),
  phone: z.string().nullable().default(null),
  whatsapp: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  cnpj: z.string().nullable().default(null),
  instagram: z.string().url().nullable().default(null),
  linkedin: z.string().url().nullable().default(null),
});

export type CompanySettings = z.infer<typeof companySchema>;

const checkoutSchema = z.object({
  maxInstallments: z.number().int().min(1).max(12).default(6),
  minInstallmentCents: z.number().int().min(500).default(5000),
  pixExpiresInHours: z.number().int().min(1).max(168).default(24),
});

export type CheckoutSettings = z.infer<typeof checkoutSchema>;

/** Destaque da página inicial (site_settings › public.home). */
const homeSchema = z.object({
  heroTitle: z.string().trim().max(160).default(""),
  heroSubtitle: z.string().trim().max(400).default(""),
  heroCtaLabel: z.string().trim().max(40).default(""),
  heroCtaHref: z.string().trim().max(300).default(""),
});

export type HomeSettings = z.infer<typeof homeSchema>;

async function readSetting(key: string): Promise<unknown> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return {};
  const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? {};
}

export const getCompanySettings = cache(async (): Promise<CompanySettings> => {
  const parsed = companySchema.safeParse(await readSetting("public.company"));
  return parsed.success ? parsed.data : companySchema.parse({});
});

export const getCheckoutSettings = cache(async (): Promise<CheckoutSettings> => {
  const parsed = checkoutSchema.safeParse(await readSetting("public.checkout"));
  return parsed.success ? parsed.data : checkoutSchema.parse({});
});

export const getHomeSettings = cache(async (): Promise<HomeSettings> => {
  const parsed = homeSchema.safeParse(await readSetting("public.home"));
  return parsed.success ? parsed.data : homeSchema.parse({});
});
