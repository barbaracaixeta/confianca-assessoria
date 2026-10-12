"use server";

import { z } from "zod";
import { authorize } from "@/lib/auth/session";
import { getPaymentEvents } from "@/lib/admin/payments";
import type { AdminPaymentEvent } from "@/lib/admin/payments";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const schema = z.object({ providerPaymentId: z.string().trim().min(1) });

export async function getPaymentEventsAction(input: { providerPaymentId: string }): Promise<Result<AdminPaymentEvent[]>> {
  const auth = await authorize("operator");
  if ("error" in auth) return { ok: false, error: auth.error };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pagamento inválido." };
  const events = await getPaymentEvents(parsed.data.providerPaymentId);
  return { ok: true, data: events };
}
