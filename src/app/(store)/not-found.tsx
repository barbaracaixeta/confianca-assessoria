import { ButtonLink } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1240px] px-5 py-24 md:px-8">
      <p className="font-serif text-sm text-muted tabular">Erro 404</p>
      <h1 className="display mt-2 text-[2.75rem] text-pine">Página não encontrada</h1>
      <p className="mt-5 max-w-md text-lg text-ink-2">O endereço pode ter mudado ou o conteúdo não está mais disponível.</p>
      <div className="mt-8 flex gap-3"><ButtonLink href="/loja">Ver produtos</ButtonLink><ButtonLink href="/" variant="outline">Página inicial</ButtonLink></div>
    </div>
  );
}
