import type { OrderStatus, PaymentStatus } from "@/types/domain";

/**
 * Máquinas de estado de pedido e pagamento.
 * - Status de pagamento só muda pelo servidor (webhook / consulta ao Asaas).
 * - "payment_confirmed" nunca é escolhido manualmente pela equipe: é consequência do pagamento.
 */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  payment_confirmed: "Pagamento confirmado",
  awaiting_files: "Aguardando arquivos",
  in_analysis: "Em análise",
  in_production: "Em produção",
  in_review: "Em revisão",
  awaiting_approval: "Aguardando aprovação",
  delivered: "Entrega liberada",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Aguardando pagamento",
  confirmed: "Pagamento confirmado",
  received: "Pagamento recebido",
  overdue: "Vencido",
  refused: "Recusado",
  refunded: "Estornado",
  cancelled: "Cancelado",
};

/** Transições que a equipe pode executar no painel. */
const STAFF_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["cancelled"],
  payment_confirmed: ["awaiting_files", "in_analysis", "cancelled"],
  awaiting_files: ["in_analysis", "cancelled"],
  in_analysis: ["awaiting_files", "in_production", "cancelled"],
  in_production: ["in_review", "cancelled"],
  in_review: ["in_production", "awaiting_approval", "delivered"],
  awaiting_approval: ["in_review", "delivered"],
  delivered: ["in_review", "completed"],
  completed: [],
  cancelled: [],
};

export function allowedStaffTransitions(from: OrderStatus): OrderStatus[] {
  return STAFF_TRANSITIONS[from];
}

export function canStaffTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STAFF_TRANSITIONS[from].includes(to);
}

/** Etapas exibidas na linha do tempo do cliente. */
export const ORDER_TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: "awaiting_payment", label: "Pedido realizado" },
  { status: "payment_confirmed", label: "Pagamento confirmado" },
  { status: "completed", label: "Produto liberado" },
];

const TIMELINE_RANK: Record<OrderStatus, number> = {
  awaiting_payment: 0,
  payment_confirmed: 1,
  awaiting_files: 1,
  in_analysis: 1,
  in_production: 1,
  in_review: 1,
  awaiting_approval: 1,
  delivered: 2,
  completed: 2,
  cancelled: -1,
};

/** Índice da última etapa concluída na linha do tempo (-1 se cancelado). */
export function timelineProgress(status: OrderStatus): number {
  return TIMELINE_RANK[status];
}

// ---------------------------------------------------------------------
// Pagamento
// ---------------------------------------------------------------------

export const PAID_STATUSES: PaymentStatus[] = ["confirmed", "received"];

export function isPaid(status: PaymentStatus): boolean {
  return PAID_STATUSES.includes(status);
}

/**
 * Transições válidas de pagamento. Eventos de webhook podem chegar fora de ordem;
 * uma transição inválida é ignorada (ex.: "pending" depois de "received").
 */
const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["confirmed", "received", "overdue", "refused", "cancelled"],
  overdue: ["pending", "confirmed", "received", "cancelled"],
  refused: ["pending", "confirmed", "received", "cancelled"],
  confirmed: ["received", "refunded"],
  received: ["refunded"],
  refunded: [],
  cancelled: ["pending"],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return from === to || PAYMENT_TRANSITIONS[from].includes(to);
}

/** Efeito no pedido quando o pagamento muda. */
export function orderStatusAfterPayment(current: OrderStatus, payment: PaymentStatus): OrderStatus {
  if (isPaid(payment) && current === "awaiting_payment") return "payment_confirmed";
  if ((payment === "refunded" || payment === "cancelled") && current === "awaiting_payment") return "cancelled";
  if (payment === "refunded") return "cancelled";
  return current;
}

/**
 * Auto-liberação: pedido 100% digital com pagamento confirmado pula direto para
 * "completed" (a entrega não depende de ação da equipe). O webhook marca
 * "payment_confirmed" quando há item físico/serviço no pedido.
 */
export function orderStatusAfterPaymentAuto(
  current: OrderStatus,
  payment: PaymentStatus,
  allItemsDigital: boolean,
): OrderStatus {
  const base = orderStatusAfterPayment(current, payment);
  if (allItemsDigital && base === "payment_confirmed") return "completed";
  return base;
}

/** Um pedido pago e não cancelado libera o download dos produtos. */
export function orderUnlocksDownloads(orderStatus: OrderStatus, paymentStatus: PaymentStatus): boolean {
  return orderStatus !== "cancelled" && isPaid(paymentStatus);
}
