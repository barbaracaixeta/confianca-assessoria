import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { demoAdmin, findEligibleStudioOrderForFile, getStudioFile } from "@/lib/demo/order-studio";

export const dynamic = "force-dynamic";

/**
 * Download de arquivo de produto digital:
 * 1. Autentica o cliente (sessão).
 * 2. Verifica (via RLS) que há um pedido do cliente, com pagamento confirmado,
 *    contendo o produto dono do arquivo.
 * 3. Gera URL assinada de curta duração e registra o download em `downloads`.
 *
 * Em modo demonstração (sem Supabase) os mesmos passos rodam sobre o
 * "Order Studio" — os arquivos são gerados na hora, apenas para exercitar o
 * fluxo no localhost.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/downloads/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (!supabase || !admin) {
    // ---------- Modo demonstração ----------
    if (isSupabaseConfigured) return NextResponse.json({ error: "backend não configurado" }, { status: 503 });
    const file = getStudioFile(id);
    if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const order = findEligibleStudioOrderForFile(id);
    if (!order) return NextResponse.json({ error: "not_purchased" }, { status: 403 });

    await demoAdmin().from("downloads").insert({
      file_id: id,
      product_id: file.productId,
      order_id: order.id,
      customer_id: user.id,
    });

    const body = Buffer.from(`
Confiança — Arquivo de demonstração
===================================
Pedido: ${order.number}
Produto: ${order.productName}
Arquivo: ${file.originalName}

Este arquivo é gerado em memória pelo "Order Studio" para testar o fluxo de
entrega no localhost. Com o Supabase configurado, o download fornece o arquivo
real do storage privado (bucket "product-files") via URL assinada.
`.trim());
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file.originalName.replace(/["\\]/g, "")}"`,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "no-store",
      },
    });
  }

  // Leitura pública (produto ativo). A validação da compra acontece abaixo.
  // select("*") para não quebrar caso a coluna `status` ainda não tenha sido
  // adicionada pela migração — nesse caso o RLS continua filtrando.
  const { data: file } = await supabase.from("product_files").select("*").eq("id", id).single();
  const fileStatus = (file as { status?: string } | null)?.status;
  if (!file || (fileStatus && fileStatus !== "active")) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .in("payment_status", ["confirmed", "received"])
    .neq("status", "cancelled")
    .eq("order_items.product_id", file.product_id);
  if (!count) return NextResponse.json({ error: "not_purchased" }, { status: 403 });

  const { data: signed, error } = await admin.storage
    .from("product-files")
    .createSignedUrl(file.path, 60, { download: file.original_name });
  if (error || !signed) return NextResponse.json({ error: "unavailable" }, { status: 502 });

  const { data: ownedOrder } = await supabase
    .from("orders")
    .select("id")
    .in("payment_status", ["confirmed", "received"])
    .neq("status", "cancelled")
    .eq("order_items.product_id", file.product_id)
    .limit(1)
    .single();

  await admin.from("downloads").insert({
    file_id: id,
    product_id: file.product_id,
    order_id: ownedOrder?.id ?? null,
    customer_id: user.id,
  });

  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "no-store" } });
}