import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";

/**
 * Cliente anônimo sem cookies — para leituras públicas do catálogo. Por não depender
 * da requisição, permite que páginas públicas sejam geradas estaticamente (ISR).
 */
export function createSupabasePublicClient() {
  if (!isSupabaseConfigured) return null;
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function publicStorageUrl(bucket: string, path: string | null): string | null {
  if (!path || !publicEnv.NEXT_PUBLIC_SUPABASE_URL) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
