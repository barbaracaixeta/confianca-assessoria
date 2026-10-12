import type { ReactNode } from "react";

/** Moldura das telas de autenticação: título editorial à esquerda, formulário em folha à direita. */
export function AuthShell({ title, intro, children, footer }: { title: string; intro: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1040px] gap-10 px-5 pt-12 pb-24 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:gap-16 md:px-8 md:pt-20">
      <div>
        <h1 className="display text-[2.75rem] text-pine md:text-[3.5rem]">{title}</h1>
        <p className="mt-5 max-w-sm text-lg leading-relaxed text-ink-2">{intro}</p>
      </div>
      <div>
        <div className="sheet px-6 py-7 md:px-8">{children}</div>
        {footer && <div className="mt-5 text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}
