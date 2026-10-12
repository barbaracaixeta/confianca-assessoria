import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Agenda os efeitos pós-resposta de `applyPaymentStatus` (e-mail/notificação)
// para rodarem e poderem ser inspecionados no teste, via o seam `after.ts`.
const { afterTasks } = vi.hoisted(() => ({ afterTasks: [] as Array<() => Promise<unknown>> }));
vi.mock("@/lib/orders/after", () => ({
  after: (fn: () => void | Promise<void>) => {
    afterTasks.push(fn as unknown as () => Promise<unknown>);
  },
}));

import { createStudioOrder, resetStudio, getStudioSnapshot, simulateStudioPayment, findEligibleStudioOrderForFile } from "./order-studio";

async function flushAfterTasks() {
  const tasks = afterTasks.splice(0);
  for (const task of tasks) await task();
}

beforeEach(() => resetStudio());
afterEach(() => resetStudio());

describe("Order Studio (fluxo digital em memória)", () => {
  it("cria um pedido em aguardando pagamento sem liberar download", async () => {
    const { orderId, providerPaymentId } = await createStudioOrder();
    const snapshot = getStudioSnapshot();
    expect(snapshot.orders).toHaveLength(1);
    expect(snapshot.orders[0]).toMatchObject({
      id: orderId,
      status: "awaiting_payment",
      paymentStatus: "pending",
      downloadAllowed: false,
      fileId: expect.any(String),
    });
    expect(snapshot.orders[0].providerPaymentId).toBe(providerPaymentId);
  });

  it("reescreve o preço pelo catálogo real", async () => {
    await createStudioOrder();
    const o = getStudioSnapshot().orders[0];
    expect(o.totalCents).toBeGreaterThan(0);
    expect(o.productName.length).toBeGreaterThan(0);
  });

  it("pagamento recebido auto-libera o pedido digital", async () => {
    const { providerPaymentId } = await createStudioOrder();
    const { changed } = await simulateStudioPayment(providerPaymentId, "received");
    expect(changed).toBe(true);

    await flushAfterTasks();
    const snapshot = getStudioSnapshot();
    expect(snapshot.orders[0]).toMatchObject({
      status: "completed",
      paymentStatus: "received",
      downloadAllowed: true,
      paidAt: expect.any(String),
    });
    expect(snapshot.notifications).toHaveLength(1);
    expect(snapshot.notifications[0]).toMatchObject({
      template: "product_available",
      recipient: expect.stringContaining("@"),
      status: "skipped",
    });
  });

  it("repetir o mesmo evento é ignorado (idempotência do webhook)", async () => {
    const { providerPaymentId } = await createStudioOrder();
    await simulateStudioPayment(providerPaymentId, "received");
    const second = await simulateStudioPayment(providerPaymentId, "received");
    expect(second.changed).toBe(false);
    expect(getStudioSnapshot().orders[0].status).toBe("completed");
  });

  it("reembolso revoga o acesso ao download", async () => {
    const { providerPaymentId, orderId } = await createStudioOrder();
    await simulateStudioPayment(providerPaymentId, "confirmed");
    expect(getStudioSnapshot().orders[0].downloadAllowed).toBe(true);

    await simulateStudioPayment(providerPaymentId, "refunded");
    const order = getStudioSnapshot().orders.find((o) => o.id === orderId);
    expect(order?.status).toBe("cancelled");
    expect(order?.downloadAllowed).toBe(false);
  });

  it("a rota de download autoriza somente pedido pago com o produto", async () => {
    const { providerPaymentId } = await createStudioOrder();
    const fileId = getStudioSnapshot().orders[0].fileId!;

    expect(findEligibleStudioOrderForFile(fileId)).toBeNull();
    await simulateStudioPayment(providerPaymentId, "received");
    expect(findEligibleStudioOrderForFile(fileId)).toMatchObject({ status: "completed", downloadAllowed: true });

    expect(findEligibleStudioOrderForFile("00000000-0000-4000-8000-000000009999")).toBeNull();
  });
});