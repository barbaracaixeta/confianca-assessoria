"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizePermission } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canStaffTransition } from "@/lib/orders/state-machine";
import type { OrderStatus } from "@/types/domain";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "awaiting_payment",
    "payment_confirmed",
    "awaiting_files",
    "in_analysis",
    "in_production",
    "in_review",
    "awaiting_approval",
    "delivered",
    "completed",
    "cancelled",
  ]),
  note: z.string().trim().max(500).optional(),
});

export async function updateOrderStatusAction(input: z.infer<typeof statusSchema>): Promise<Result> {
  const auth = await authorizePermission("orders.edit");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { data: order } = await admin.from("orders").select("status").eq("id", parsed.data.id).maybeSingle();
  if (!order) return { ok: false, error: "Pedido não encontrado." };

  const from = order.status as OrderStatus;
  const to = parsed.data.status;
  if (from !== to && !canStaffTransition(from, to)) {
    return { ok: false, error: "Transição de status não permitida." };
  }

  const { error } = await admin.from("orders").update({ status: to }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };

  if (parsed.data.note) {
    await admin
      .from("order_status_history")
      .update({ note: parsed.data.note })
      .eq("order_id", parsed.data.id)
      .eq("to_status", to)
      .is("note", null);
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${parsed.data.id}`);
  return { ok: true, data: undefined };
}

const assignSchema = z.object({ id: z.string().uuid(), assigneeId: z.string().uuid().nullable() });

export async function setOrderAssigneeAction(input: z.infer<typeof assignSchema>): Promise<Result> {
  const auth = await authorizePermission("orders.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { error } = await admin.from("orders").update({ assignee_id: parsed.data.assigneeId }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: `Não foi possível atribuir: ${error.message}` };
  revalidatePath(`/admin/pedidos/${parsed.data.id}`);
  return { ok: true, data: undefined };
}

const dueDateSchema = z.object({ id: z.string().uuid(), dueAt: z.string().nullable() });

export async function setOrderDueDateAction(input: z.infer<typeof dueDateSchema>): Promise<Result> {
  const auth = await authorizePermission("orders.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = dueDateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { error } = await admin
    .from("orders")
    .update({ due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: `Não foi possível salvar o prazo: ${error.message}` };
  revalidatePath(`/admin/pedidos/${parsed.data.id}`);
  return { ok: true, data: undefined };
}

const notesSchema = z.object({ id: z.string().uuid(), customerNotes: z.string().trim().max(2000) });

export async function setOrderNotesAction(input: z.infer<typeof notesSchema>): Promise<Result> {
  const auth = await authorizePermission("orders.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { error } = await admin
    .from("orders")
    .update({ customer_notes: parsed.data.customerNotes || null })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: `Não foi possível salvar as observações: ${error.message}` };
  revalidatePath(`/admin/pedidos/${parsed.data.id}`);
  return { ok: true, data: undefined };
}
