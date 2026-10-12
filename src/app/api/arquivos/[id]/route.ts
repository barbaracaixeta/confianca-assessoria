import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Download de arquivo privado: a leitura da linha em `files` passa pelo RLS
 * (dono ou equipe). Só então geramos uma URL assinada de curta duração.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/arquivos/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data: file } = await supabase.from("files").select("bucket, path, original_name").eq("id", id).maybeSingle();
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data, error } = await admin.storage.from(file.bucket).createSignedUrl(file.path, 60, { download: file.original_name });
  if (error || !data) return NextResponse.json({ error: "unavailable" }, { status: 502 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
