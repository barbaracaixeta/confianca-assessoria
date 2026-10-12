import "server-only";
import { serverEnv } from "@/lib/env.server";
import type {
  AsaasCreateCustomer,
  AsaasCreatePayment,
  AsaasCustomer,
  AsaasErrorBody,
  AsaasPayment,
  AsaasPixQrCode,
} from "./types";

/**
 * Camada isolada de acesso ao Asaas. Só roda no servidor; a chave nunca chega ao navegador.
 * Sandbox: ASAAS_API_URL=https://api-sandbox.asaas.com/v3 (padrão)
 * Produção: ASAAS_API_URL=https://api.asaas.com/v3 + chave $aact_prod_...
 */
export class AsaasError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: { code: string; description: string }[] = [],
  ) {
    super(message);
    this.name = "AsaasError";
  }

  /** Mensagem segura para exibir ao cliente (o Asaas já descreve recusas em português). */
  get userMessage(): string {
    return this.details[0]?.description ?? "Não foi possível processar o pagamento. Tente novamente.";
  }
}

export function isAsaasConfigured(): boolean {
  return Boolean(serverEnv.ASAAS_API_KEY);
}

async function request<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  if (!serverEnv.ASAAS_API_KEY) throw new AsaasError("ASAAS_API_KEY não configurada", 500);

  const res = await fetch(`${serverEnv.ASAAS_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "confianca-assessoria/1.0",
      access_token: serverEnv.ASAAS_API_KEY,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as AsaasErrorBody;
    throw new AsaasError(`Asaas ${init.method ?? "GET"} ${path} falhou (${res.status})`, res.status, body.errors);
  }
  return (await res.json()) as T;
}

export const asaas = {
  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    const r = await request<{ data: AsaasCustomer[] }>(`/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`);
    return r.data[0] ?? null;
  },

  createCustomer(input: AsaasCreateCustomer) {
    return request<AsaasCustomer>("/customers", { method: "POST", body: JSON.stringify(input) });
  },

  createPayment(input: AsaasCreatePayment) {
    return request<AsaasPayment>("/payments", { method: "POST", body: JSON.stringify(input) });
  },

  getPayment(id: string) {
    return request<AsaasPayment>(`/payments/${encodeURIComponent(id)}`);
  },

  getPixQrCode(id: string) {
    return request<AsaasPixQrCode>(`/payments/${encodeURIComponent(id)}/pixQrCode`);
  },

  deletePayment(id: string) {
    return request<{ deleted: boolean }>(`/payments/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
