import { getMyFiles } from "@/lib/orders/customer-queries";
import { FileList } from "@/components/store/file-list";
import { EmptyState } from "@/components/ui/feedback";

export default async function MyFilesPage() {
  const files = await getMyFiles();
  const sent = files.filter((f) => f.kind === "customer_upload");
  const delivered = files.filter((f) => f.kind === "delivery");
  return (
    <div>
      <h1 className="display text-[2.5rem] text-pine md:text-[3rem]">Arquivos</h1>
      <p className="mt-3 max-w-[56ch] text-muted">Arquivos ficam em armazenamento privado. Os downloads usam links temporários.</p>
      <section className="mt-10">
        <h2 className="text-[1.8rem] text-ink">Entregues pela equipe</h2>
        <div className="mt-4">{delivered.length ? <FileList files={delivered} showOrder /> : <p className="border-t border-line py-6 text-sm text-muted">Nenhuma entrega ainda.</p>}</div>
      </section>
      <section className="mt-12">
        <h2 className="text-[1.8rem] text-ink">Enviados por você</h2>
        <div className="mt-4">
          {sent.length ? <FileList files={sent} showOrder /> : <EmptyState title="Nenhum arquivo enviado" description="Envie arquivos pela página de cada pedido, depois da confirmação do pagamento." />}
        </div>
      </section>
    </div>
  );
}
