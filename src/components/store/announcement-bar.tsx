import Link from "next/link";

const MESSAGES = [
  "Compra digital com entrega imediata após a confirmação do pagamento",
  "Pix ou cartão em até 6x",
  "Download ilimitado na sua conta",
];

/**
 * Faixa institucional fina no topo da loja. Repete apenas fatos operacionais já
 * praticados pela loja — nada de contadores ou métricas inventadas.
 */
export function AnnouncementBar() {
  return (
    <div className="bg-pine text-paper">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-2 text-center text-xs md:px-8">
        {MESSAGES.map((message, i) => (
          <span key={message} className="inline-flex items-center gap-3">
            {i > 0 && <span aria-hidden="true" className="text-paper/40">·</span>}
            <span className="text-paper/85">{message}</span>
          </span>
        ))}
        <Link href="/como-funciona" className="hidden font-medium text-paper underline underline-offset-2 hover:text-paper sm:inline">
          Como funciona
        </Link>
      </div>
    </div>
  );
}
