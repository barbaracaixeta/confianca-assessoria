import { z } from "zod";
import { onlyDigits } from "@/lib/utils";

export const cartLineSchema = z.object({
  productId: z.string().uuid(),
  slug: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(10000),
  notes: z.string().trim().max(1000).optional(),
});

export const cartSchema = z.array(cartLineSchema).max(30);

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,32}$/, "Código de cupom inválido.");

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export const cpfCnpjSchema = z
  .string()
  .transform(onlyDigits)
  .refine((v) => (v.length === 11 ? isValidCpf(v) : v.length === 14 ? isValidCnpj(v) : false), "Informe um CPF ou CNPJ válido.");

export const phoneSchema = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 10 || v.length === 11, "Informe um telefone com DDD.");

export const customerDetailsSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo.").max(120),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(160),
  phone: phoneSchema,
  cpfCnpj: cpfCnpjSchema,
});

export type CustomerDetails = z.infer<typeof customerDetailsSchema>;

export const cardSchema = z.object({
  holderName: z.string().trim().min(3, "Nome como impresso no cartão.").max(80),
  number: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length >= 13 && v.length <= 19, "Número de cartão inválido."),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "Mês inválido."),
  expiryYear: z.string().regex(/^20\d{2}$/, "Ano inválido."),
  ccv: z.string().regex(/^\d{3,4}$/, "Código inválido."),
  postalCode: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 8, "CEP inválido."),
  addressNumber: z.string().trim().min(1, "Informe o número.").max(10),
  installments: z.coerce.number().int().min(1).max(12),
});

export type CardInput = z.infer<typeof cardSchema>;

export const checkoutSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("pix"),
    customer: customerDetailsSchema,
    lines: cartSchema.min(1, "Seu carrinho está vazio."),
    couponCode: couponCodeSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
    acceptedTerms: z.literal(true, { error: "É preciso aceitar os termos para continuar." }),
  }),
  z.object({
    method: z.literal("credit_card"),
    customer: customerDetailsSchema,
    lines: cartSchema.min(1, "Seu carrinho está vazio."),
    couponCode: couponCodeSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
    acceptedTerms: z.literal(true, { error: "É preciso aceitar os termos para continuar." }),
    card: cardSchema,
  }),
]);

export type CheckoutInput = z.infer<typeof checkoutSchema>;
