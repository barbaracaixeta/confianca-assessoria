import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Cliente com service role — ignora RLS. Uso restrito ao servidor, em operações
 * que o próprio servidor autoriza: criação de pedidos, webhook de pagamento,
 * validação de cupons e uploads com verificação de propriedade.
 */
export function createSupabaseAdminClient() {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !serverEnv.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminSupabase = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
