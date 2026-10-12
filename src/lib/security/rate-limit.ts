import "server-only";
import { headers } from "next/headers";

/**
 * Limitador simples por janela fixa, em memória da instância.
 * Suficiente para conter abuso básico (tentativas de cupom, checkout em loop).
 * Em produção com várias instâncias, troque o `store` por Redis/Upstash
 * mantendo a mesma interface (ver README › Segurança).
 */
const store = new Map<string, { count: number; resetAt: number }>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function rateLimit(bucket: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfterMs: number }> {
  const key = `${bucket}:${await clientIp()}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 10_000) {
      for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
    }
    return { ok: true, retryAfterMs: 0 };
  }

  entry.count += 1;
  return entry.count > limit ? { ok: false, retryAfterMs: entry.resetAt - now } : { ok: true, retryAfterMs: 0 };
}
