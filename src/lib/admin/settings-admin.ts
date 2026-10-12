import "server-only";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const companySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da empresa.").max(160).default("Confiança Assessoria Acadêmica"),
  email: z.string().trim().email("E-mail inválido.").nullable().default(null),
  phone: z.string().trim().max(40).nullable().default(null),
  whatsapp: z.string().trim().max(40).nullable().default(null),
  address: z.string().trim().max(240).nullable().default(null),
  cnpj: z.string().trim().max(24).nullable().default(null),
  instagram: z.string().trim().url("URL inválida.").nullable().default(null),
  linkedin: z.string().trim().url("URL inválida.").nullable().default(null),
});

export const checkoutSchema = z.object({
  maxInstallments: z.number().int().min(1, "Mínimo de 1 parcela.").max(12, "Máximo de 12 parcelas.").default(6),
  minInstallmentCents: z.number().int().min(500, "A parcela mínima é R$ 5,00.").default(5000),
  pixExpiresInHours: z.number().int().min(1, "Mínimo de 1 hora.").max(168, "Máximo de 168 horas.").default(24),
});

export const homeContentSchema = z.object({
  heroTitle: z.string().trim().min(1, "Informe o título do destaque.").max(160),
  heroSubtitle: z.string().trim().max(400).default(""),
  heroCtaLabel: z.string().trim().max(40).default(""),
  heroCtaHref: z.string().trim().max(300).default(""),
});

export type CompanySettings = z.infer<typeof companySchema>;
export type CheckoutSettings = z.infer<typeof checkoutSchema>;
export type HomeContent = z.infer<typeof homeContentSchema>;

async function readRaw(key: string): Promise<unknown> {
  const admin = createSupabaseAdminClient();
  if (!admin) return {};
  const { data } = await admin.from("site_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? {};
}

export async function getAdminCompanySettings(): Promise<CompanySettings> {
  const parsed = companySchema.safeParse(await readRaw("public.company"));
  return parsed.success ? parsed.data : companySchema.parse({});
}

export async function getAdminCheckoutSettings(): Promise<CheckoutSettings> {
  const parsed = checkoutSchema.safeParse(await readRaw("public.checkout"));
  return parsed.success ? parsed.data : checkoutSchema.parse({});
}

export async function getAdminHomeContent(): Promise<HomeContent> {
  const parsed = homeContentSchema.safeParse(await readRaw("public.home"));
  return parsed.success ? parsed.data : { heroTitle: "", heroSubtitle: "", heroCtaLabel: "", heroCtaHref: "" };
}
