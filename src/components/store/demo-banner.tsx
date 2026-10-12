import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";

/** Aviso visível enquanto o backend não está configurado — evita confundir dados mockados com reais. */
export function DemoBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-ink px-5 py-2 text-center text-xs text-paper/85">
      Ambiente de demonstração: catálogo com dados de exemplo.{" "}
      <Link className="underline underline-offset-2 hover:text-paper" href="/demo">Testar fluxo de pedido e download no Order Studio</Link>
      {" · "}Configure o Supabase para ativar pedidos e pagamentos reais.
    </div>
  );
}