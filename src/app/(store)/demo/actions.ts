"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import {
  clearDemoSession,
  createStudioOrder,
  resetStudio,
  setDemoSession,
  setStudioFeedback,
  simulateStudioPayment,
} from "@/lib/demo/order-studio";
import type { PaymentStatus } from "@/types/domain";

function refresh() {
  revalidatePath("/demo");
  revalidatePath("/minha-conta");
  revalidatePath("/minha-conta/produtos");
  revalidatePath("/minha-conta/pedidos");
}

async function requireDemo(): Promise<boolean> {
  if (isSupabaseConfigured) {
    setStudioFeedback("O Order Studio só existe em modo demonstração (sem Supabase).");
    return false;
  }
  return true;
}

export async function createDemoOrderAction(): Promise<void> {
  if (!(await requireDemo())) return;
  try {
    const { orderId, providerPaymentId } = await createStudioOrder();
    setStudioFeedback(`Pedido ${orderId} criado (pagamento ${providerPaymentId}).`);
  } catch (e) {
    setStudioFeedback(e instanceof Error ? e.message : String(e));
  }
  refresh();
}

export async function simulatePaymentAction(form: FormData): Promise<void> {
  if (!(await requireDemo())) return;
  const providerPaymentId = String(form.get("providerPaymentId") ?? "");
  const next = String(form.get("next") ?? "") as PaymentStatus;
  if (!providerPaymentId) return;
  const allowed: PaymentStatus[] = ["confirmed", "received", "refused", "refunded", "overdue", "cancelled"];
  if (!allowed.includes(next)) return;
  const res = await simulateStudioPayment(providerPaymentId, next);
  if (res.error) {
    setStudioFeedback(res.error);
  } else if (res.changed) {
    setStudioFeedback(`Webhook simulado: pagamento ${next} aplicado.`);
  } else {
    setStudioFeedback("Transição ignorada (inválida ou sem efeito nas regras de estado).");
  }
  refresh();
}

export async function resetDemoAction(): Promise<void> {
  if (!(await requireDemo())) return;
  resetStudio();
  setStudioFeedback("Studio reiniciado.");
  refresh();
}

export async function enterDemoSessionAction(): Promise<void> {
  if (!(await requireDemo())) return;
  await setDemoSession();
  setStudioFeedback("Você entrou como Cliente de Demonstração.");
  refresh();
}

export async function leaveDemoSessionAction(): Promise<void> {
  await clearDemoSession();
  setStudioFeedback("Sessão demo encerrada.");
  refresh();
}