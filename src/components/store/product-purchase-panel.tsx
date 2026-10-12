"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useCart } from "./cart-provider";
import { Button } from "@/components/ui/button";
import { Price } from "./price";
import { quoteProduct } from "@/lib/pricing";
import { productBundleSize } from "./product-cover";
import { formatBytes } from "@/lib/files/rules";
import type { Product } from "@/types/domain";

function FileRow({ product }: { product: Product }) {
  const files = product.files ?? [];
  return (
    <div className="space-y-2.5">
      {files.length === 0 ? (
        <p className="pl-1 text-sm text-muted">Conteúdo digital entregue por download.</p>
      ) : (
        files.map((f) => (
          <div key={f.id} className="flex items-center gap-3 text-sm">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-green-50 text-[11px] font-bold text-pine">
              {f.originalName.split(".").pop()?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-ink">{f.label || f.originalName}</p>
              {f.sizeBytes > 0 && <p className="text-xs text-muted">{formatBytes(f.sizeBytes)}</p>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function ProductPurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = quoteProduct(product, 1);
  const bundleSize = productBundleSize(product);
  const formats = [...new Set((product.files ?? []).map((f) => f.originalName.split(".").pop()?.toUpperCase()).filter(Boolean))];

  function addToCart({ go }: { go?: boolean } = {}) {
    add({ productId: product.id, slug: product.slug, quantity: 1 });
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1600);
    if (go) router.push("/carrinho");
  }

  return (
    <div className="border-t-2 border-pine bg-sheet px-6 pt-6 pb-7 md:px-7">
      <Price quote={q} size="lg" prefix="Preço à vista" />
      <p className="mt-2 text-sm text-green">Entrega imediata após a confirmação do pagamento.</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-4 text-sm">
        <div>
          <dt className="text-xs text-muted">Formato</dt>
          <dd className="mt-0.5 text-ink">{formats.length > 0 ? formats.join(" · ") : "Digital"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Arquivos</dt>
          <dd className="mt-0.5 text-ink">{product.files.length} {product.files.length === 1 ? "arquivo" : "arquivos"}{bundleSize && ` · ${bundleSize}`}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Compatibilidade</dt>
          <dd className="mt-0.5 text-ink">Windows · macOS · Google Docs</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Pagamento</dt>
          <dd className="mt-0.5 text-ink">Pix ou cartão</dd>
        </div>
      </dl>

      <div className="mt-6">
        <p className="text-xs font-medium text-muted">O que está incluso</p>
        <div className="mt-3">
          <FileRow product={product} />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        <Button variant="accent" size="lg" onClick={() => addToCart({ go: true })}>
          Comprar agora
        </Button>
        <Button variant="outline" size="lg" onClick={() => addToCart()}>
          {added ? "Adicionado ✓" : "Adicionar ao carrinho"}
        </Button>
      </div>

      <p className="mt-3 min-h-5 text-sm" role="status" aria-live="polite">
        {added && (
          <span className="motion-safe:animate-[fade-in_0.3s_both] text-pine">
            Produto no carrinho.{" "}
            <Link href="/carrinho" className="font-medium underline underline-offset-2">
              Ver carrinho
            </Link>
          </span>
        )}
      </p>
    </div>
  );
}