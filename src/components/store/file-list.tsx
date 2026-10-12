import Link from "next/link";
import { formatBytes } from "@/lib/files/rules";
import { formatDate } from "@/lib/utils";
import type { CustomerFile } from "@/lib/orders/customer-queries";

export function FileList({ files, showOrder = false }: { files: CustomerFile[]; showOrder?: boolean }) {
  return (
    <ul className="border-t border-line">
      {files.map((f) => (
        <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3.5">
          <div className="min-w-0">
            <p className="truncate text-ink">{f.originalName}</p>
            <p className="text-xs text-muted">
              {formatBytes(f.sizeBytes)}, {formatDate(f.createdAt, { dateStyle: "short" })}
              {showOrder && f.orderId && (
                <>
                  {", pedido "}
                  <Link href={`/minha-conta/pedidos/${f.orderId}`} className="text-pine hover:underline">#{f.orderNumber}</Link>
                </>
              )}
            </p>
          </div>
          <a href={`/api/arquivos/${f.id}`} className="text-sm font-medium text-pine hover:underline">Baixar</a>
        </li>
      ))}
    </ul>
  );
}
