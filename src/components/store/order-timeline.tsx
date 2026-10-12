import { ORDER_STATUS_LABEL, ORDER_TIMELINE, timelineProgress } from "@/lib/orders/state-machine";
import { cn, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/types/domain";

/** Linha do tempo vertical do pedido. Etapas concluídas em verde; atual com marcador laranja. */
export function OrderTimeline({ status, history }: { status: OrderStatus; history: { toStatus: OrderStatus; createdAt: string }[] }) {
  if (status === "cancelled") {
    return <p className="border-l-2 border-danger pl-4 text-sm text-danger">Pedido cancelado.</p>;
  }
  const progress = timelineProgress(status);
  const when = (s: OrderStatus) => history.findLast((h) => h.toStatus === s)?.createdAt;

  return (
    <ol className="relative">
      {ORDER_TIMELINE.map((step, i) => {
        const done = i <= progress;
        const current = i === progress;
        const at = when(step.status);
        return (
          <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
            {i < ORDER_TIMELINE.length - 1 && (
              <span className={cn("absolute top-3 left-[5px] h-full w-px", i < progress ? "bg-green" : "bg-line")} aria-hidden="true" />
            )}
            <span
              className={cn(
                "relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 transition-colors duration-500",
                current ? "border-amber bg-amber" : done ? "border-green bg-green" : "border-line-strong bg-sheet",
              )}
              aria-hidden="true"
            />
            <div>
              <p className={cn("text-sm", current ? "font-semibold text-ink" : done ? "text-ink-2" : "text-muted")}>
                {step.label}
                {current && status !== step.status && <span className="font-normal text-muted"> ({ORDER_STATUS_LABEL[status]})</span>}
                <span className="sr-only">{done ? (current ? " — etapa atual" : " — concluída") : " — pendente"}</span>
              </p>
              {at && done && <p className="text-xs text-muted">{formatDate(at, { dateStyle: "short", timeStyle: "short" })}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
