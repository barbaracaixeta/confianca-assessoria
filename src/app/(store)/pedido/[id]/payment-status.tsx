"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PaymentStatus } from "@/types/domain";

/** Copia o código Pix com confirmação visual. */
export function CopyPix({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label htmlFor="pix-code" className="text-sm font-medium text-ink">Pix copia e cola</label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="pix-code"
          readOnly
          value={payload}
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 w-full min-w-0 rounded-[var(--radius-sm)] border border-line-strong bg-paper px-3 font-mono text-xs text-ink-2"
        />
        <Button
          type="button"
          variant={copied ? "primary" : "accent"}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(payload);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            } catch {
              document.getElementById("pix-code")?.focus();
            }
          }}
        >
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Acompanha o pagamento pendente consultando o servidor. Quando muda, recarrega
 * a página (os dados vêm do banco, atualizados pelo webhook).
 */
export function PaymentWatcher({ orderId, token, initial }: { orderId: string; token: string | null; initial: PaymentStatus }) {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    if (initial !== "pending") return;
    let stopped = false;
    async function tick() {
      if (stopped || document.hidden) return schedule();
      attempts.current += 1;
      // A cada 4 consultas pede também a conferência no Asaas pelo servidor.
      const verify = attempts.current % 4 === 0 ? "&verify=1" : "";
      const qs = token ? `?t=${encodeURIComponent(token)}${verify}` : verify ? `?verify=1` : "";
      try {
        const res = await fetch(`/api/pedidos/${orderId}/status${qs}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { paymentStatus: PaymentStatus };
          if (data.paymentStatus !== initial) {
            router.refresh();
            return;
          }
        }
      } catch {}
      schedule();
    }
    function schedule() {
      if (!stopped && attempts.current < 120) setTimeout(tick, attempts.current < 20 ? 4000 : 10000);
    }
    schedule();
    return () => {
      stopped = true;
    };
  }, [orderId, token, initial, router]);

  return null;
}
