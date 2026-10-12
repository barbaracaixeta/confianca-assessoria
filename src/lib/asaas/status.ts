import type { PaymentStatus } from "@/types/domain";
import type { AsaasPaymentStatus } from "./types";

/** Eventos de webhook → status interno. Eventos fora da lista são registrados e ignorados. */
export const ASAAS_EVENT_STATUS: Record<string, PaymentStatus> = {
  PAYMENT_CREATED: "pending",
  PAYMENT_RESTORED: "pending",
  PAYMENT_AWAITING_RISK_ANALYSIS: "pending",
  PAYMENT_APPROVED_BY_RISK_ANALYSIS: "pending",
  PAYMENT_CONFIRMED: "confirmed",
  PAYMENT_RECEIVED: "received",
  PAYMENT_OVERDUE: "overdue",
  PAYMENT_DELETED: "cancelled",
  PAYMENT_REFUNDED: "refunded",
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: "refused",
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: "refused",
};

/** Status retornado pela API (criação/consulta) → status interno. */
export function mapAsaasStatus(status: AsaasPaymentStatus): PaymentStatus {
  switch (status) {
    case "CONFIRMED":
      return "confirmed";
    case "RECEIVED":
    case "RECEIVED_IN_CASH":
    case "DUNNING_RECEIVED":
      return "received";
    case "OVERDUE":
      return "overdue";
    case "REFUNDED":
      return "refunded";
    default:
      return "pending";
  }
}
