"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProductAction } from "./actions";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    setError(null);
    if (!window.confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;

    setBusy(true);
    let res = await deleteProductAction({ id });

    if (!res.ok && res.soldOrders) {
      const proceed = window.confirm(`${res.error}\n\nExcluir mesmo assim?`);
      if (proceed) res = await deleteProductAction({ id, force: true });
      else res = { ok: true, data: undefined };
    }

    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="text-sm text-muted hover:text-danger disabled:opacity-50"
      >
        {busy ? "Excluindo…" : "Excluir"}
      </button>
      {error && <span className="mt-1 max-w-[16rem] text-xs text-danger">{error}</span>}
    </span>
  );
}
