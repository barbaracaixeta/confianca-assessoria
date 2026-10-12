import { createSupabasePublicClient } from "@/lib/supabase/public";

/** Termos e política de privacidade editáveis no painel (site_settings › public.policies). */
export async function PolicyPage({ kind, title }: { kind: "terms" | "privacy"; title: string }) {
  const supabase = createSupabasePublicClient();
  const { data } = (await supabase?.from("site_settings").select("value").eq("key", "public.policies").maybeSingle()) ?? {};
  const text = (data?.value as Record<string, string> | undefined)?.[kind]?.trim();
  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-12 pb-24 md:px-8 md:pt-16">
      <h1 className="display text-[3.3rem] text-pine md:text-[4.5rem]">{title}</h1>
      {text ? (
        <div className="prose-academic mt-10">{text.split(/\n{2,}/).map((p) => <p key={p.slice(0, 40)}>{p}</p>)}</div>
      ) : (
        <p className="mt-10 max-w-xl border-l-2 border-amber pl-4 text-muted">
          Este documento ainda não foi publicado. O texto é cadastrado pela administração em Configurações › Políticas.
        </p>
      )}
    </div>
  );
}
