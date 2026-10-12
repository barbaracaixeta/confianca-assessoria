"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_UPLOADS, extensionOf, storageSafeName, validateUpload } from "@/lib/files/rules";
import { rateLimit } from "@/lib/security/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { appUrl } from "@/lib/env";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const BUCKET = "order-files";
const UPLOAD_ALLOWED_STATUSES = ["payment_confirmed", "awaiting_files", "in_analysis", "in_production", "in_review", "awaiting_approval"];

/** Confirma, via RLS, que o pedido pertence ao usuário logado. */
async function ownedOrder(orderId: string) {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return null;
  const { data } = await supabase
    .from("orders")
    .select("id, number, status, customer_id, customers!inner(profile_id, email)")
    .eq("id", orderId)
    .maybeSingle();
  const customer = data?.customers as unknown as { profile_id: string; email: string } | undefined;
  if (!data || customer?.profile_id !== user.id) return null;
  return { user, order: data as { id: string; number: string; status: string; customer_id: string }, email: customer.email };
}

/** Etapa 1 do upload: valida e devolve uma URL assinada para envio direto ao Storage. */
export async function createUploadUrlAction(input: { orderId: string; fileName: string; size: number }): Promise<Result<{ path: string; token: string }>> {
  const parsed = z.object({ orderId: z.string().uuid(), fileName: z.string().min(1).max(200), size: z.number().int() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Arquivo inválido." };

  const limited = await rateLimit("upload", 30, 10 * 60_000);
  if (!limited.ok) return { ok: false, error: "Muitos envios seguidos. Aguarde alguns minutos." };

  const invalid = validateUpload(parsed.data.fileName, parsed.data.size);
  if (invalid) return { ok: false, error: invalid };

  const owned = await ownedOrder(parsed.data.orderId);
  if (!owned) return { ok: false, error: "Pedido não encontrado." };
  if (!UPLOAD_ALLOWED_STATUSES.includes(owned.order.status)) {
    return { ok: false, error: "O envio de arquivos é liberado após a confirmação do pagamento." };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Armazenamento não configurado." };

  const path = `${owned.order.id}/${randomUUID()}-${storageSafeName(parsed.data.fileName)}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Não foi possível preparar o envio. Tente novamente." };
  return { ok: true, data: { path: data.path, token: data.token } };
}

/** Etapa 2: confere que o objeto existe no Storage e registra o arquivo no pedido. */
export async function confirmUploadAction(input: { orderId: string; path: string; fileName: string }): Promise<Result> {
  const parsed = z.object({ orderId: z.string().uuid(), path: z.string().min(1), fileName: z.string().min(1).max(200) }).safeParse(input);
  if (!parsed.success || !parsed.data.path.startsWith(`${parsed.data.orderId}/`)) return { ok: false, error: "Envio inválido." };

  const owned = await ownedOrder(parsed.data.orderId);
  const admin = createSupabaseAdminClient();
  if (!owned || !admin) return { ok: false, error: "Pedido não encontrado." };

  const folder = parsed.data.orderId;
  const objectName = parsed.data.path.slice(folder.length + 1);
  const { data: listed } = await admin.storage.from(BUCKET).list(folder, { search: objectName, limit: 1 });
  const obj = listed?.find((o) => o.name === objectName);
  const size = Number(obj?.metadata?.size ?? 0);
  if (!obj || validateUpload(parsed.data.fileName, size)) {
    if (obj) await admin.storage.from(BUCKET).remove([parsed.data.path]);
    return { ok: false, error: "O arquivo não chegou completo. Envie novamente." };
  }

  const { data: file, error } = await admin
    .from("files")
    .insert({
      bucket: BUCKET,
      path: parsed.data.path,
      original_name: parsed.data.fileName.slice(0, 200),
      mime_type: ALLOWED_UPLOADS[extensionOf(parsed.data.fileName)],
      size_bytes: size,
      kind: "customer_upload",
      customer_id: owned.order.customer_id,
      uploaded_by: owned.user.id,
    })
    .select("id")
    .single();
  if (error || !file) return { ok: false, error: "Não foi possível registrar o arquivo." };

  await admin.from("order_files").insert({ order_id: owned.order.id, file_id: file.id });
  if (owned.order.status === "payment_confirmed" || owned.order.status === "awaiting_files") {
    await admin.from("orders").update({ status: "in_analysis" }).eq("id", owned.order.id);
  }

  after(() =>
    sendEmail(admin, owned.email, {
      name: "file_received",
      data: { orderNumber: owned.order.number, fileName: parsed.data.fileName, orderUrl: `${appUrl}/minha-conta/pedidos/${owned.order.id}` },
    }, owned.user.id),
  );

  revalidatePath(`/minha-conta/pedidos/${owned.order.id}`);
  return { ok: true, data: undefined };
}

export async function sendMessageAction(_: { error?: string; ok?: boolean }, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const parsed = z.object({ orderId: z.string().uuid(), body: z.string().trim().min(1, "Escreva uma mensagem.").max(5000) }).safeParse({
    orderId: form.get("orderId"),
    body: form.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const limited = await rateLimit("message", 20, 10 * 60_000);
  if (!limited.ok) return { error: "Muitas mensagens seguidas. Aguarde um pouco." };

  const owned = await ownedOrder(parsed.data.orderId);
  const supabase = await createSupabaseServerClient();
  if (!owned || !supabase) return { error: "Pedido não encontrado." };

  // Inserção com a sessão do cliente: a policy de RLS confirma a autoria e o pedido.
  const { error } = await supabase.from("messages").insert({ order_id: owned.order.id, author_id: owned.user.id, is_staff: false, body: parsed.data.body });
  if (error) return { error: "Não foi possível enviar a mensagem." };
  revalidatePath(`/minha-conta/pedidos/${owned.order.id}`);
  return { ok: true };
}
