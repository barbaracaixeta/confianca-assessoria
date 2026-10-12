import { describe, expect, it } from "vitest";
import {
  canTransitionPayment,
  orderStatusAfterPayment,
  orderStatusAfterPaymentAuto,
  orderUnlocksDownloads,
  timelineProgress,
} from "./state-machine";

describe("auto-liberação de pedido digital", () => {
  it("pagamento recebido em pedido 100% digital pula direto para completed", () => {
    expect(orderStatusAfterPaymentAuto("awaiting_payment", "received", true)).toBe("completed");
  });

  it("pagamento confirmado em pedido digital também completa", () => {
    expect(orderStatusAfterPaymentAuto("awaiting_payment", "confirmed", true)).toBe("completed");
  });

  it("pedido com item não-digital param em payment_confirmed", () => {
    expect(orderStatusAfterPaymentAuto("awaiting_payment", "received", false)).toBe("payment_confirmed");
  });

  it("sem o helper, o efeito base é payment_confirmed", () => {
    expect(orderStatusAfterPayment("awaiting_payment", "received")).toBe("payment_confirmed");
  });

  it("reembolso cancela mesmo em pedido digital", () => {
    expect(orderStatusAfterPaymentAuto("awaiting_payment", "refunded", true)).toBe("cancelled");
  });

  it("pagamento em andamento não altera o status", () => {
    expect(orderStatusAfterPaymentAuto("awaiting_payment", "pending", true)).toBe("awaiting_payment");
  });
});

describe("liberação de download", () => {
  it("libera somente quando pago e não cancelado", () => {
    expect(orderUnlocksDownloads("completed", "received")).toBe(true);
    expect(orderUnlocksDownloads("payment_confirmed", "confirmed")).toBe(true);
    expect(orderUnlocksDownloads("cancelled", "received")).toBe(false);
    expect(orderUnlocksDownloads("awaiting_payment", "pending")).toBe(false);
    expect(orderUnlocksDownloads("completed", "refunded")).toBe(false);
  });
});

describe("transições de pagamento", () => {
  it("aceita os eventos de webhook fora de ordem previstos", () => {
    expect(canTransitionPayment("pending", "received")).toBe(true);
    expect(canTransitionPayment("pending", "refused")).toBe(true);
    expect(canTransitionPayment("pending", "overdue")).toBe(true);
    expect(canTransitionPayment("confirmed", "received")).toBe(true);
    expect(canTransitionPayment("received", "refunded")).toBe(true);
  });

  it("ignora transições inválidas (idempotência)", () => {
    expect(canTransitionPayment("pending", "pending")).toBe(true);
    expect(canTransitionPayment("received", "pending")).toBe(false);
    expect(canTransitionPayment("received", "confirmed")).toBe(false);
    expect(canTransitionPayment("refunded", "received")).toBe(false);
  });

  it("timeline de produto digital marca completed no passo final", () => {
    expect(timelineProgress("awaiting_payment")).toBe(0);
    expect(timelineProgress("payment_confirmed")).toBe(1);
    expect(timelineProgress("completed")).toBe(2);
    expect(timelineProgress("cancelled")).toBe(-1);
  });
});