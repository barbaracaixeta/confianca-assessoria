"use client";
import { Button } from "@/components/ui/button";
export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-24 md:px-8" role="alert">
      <h1 className="display text-[3rem] text-pine">Algo não carregou</h1>
      <p className="mt-5 max-w-md text-lg text-ink-2">Houve uma falha ao buscar os dados desta página. Tente novamente em instantes.</p>
      <Button className="mt-8" onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
