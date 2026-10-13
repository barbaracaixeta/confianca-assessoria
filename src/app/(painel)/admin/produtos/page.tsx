import { requireAdminPermission } from "@/lib/admin/access";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/feedback";
import { getAdminInstitutions, getAdminProducts } from "@/lib/admin/catalog";
import { formatMoney } from "@/lib/utils";
import { toggleProductFormAction } from "./actions";
import { UploadPanel } from "./upload-panel";
import { DeleteProductButton } from "./delete-product-button";
import { ProductFilters } from "./product-filters";

export const metadata: Metadata = { title: "Produtos" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/produtos">) {
  await requireAdminPermission("products.view");
  const sp = await searchParams;
  const [allProducts, institutions] = await Promise.all([getAdminProducts(), getAdminInstitutions()]);

  const q = (typeof sp.q === "string" ? sp.q : "").trim().toLowerCase();
  const institution = typeof sp.instituicao === "string" ? sp.instituicao : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  const products = allProducts.filter((p) => {
    if (q && !`${p.name} ${p.institution ?? ""}`.toLowerCase().includes(q)) return false;
    if (institution === "none" && p.institutionId) return false;
    if (institution && institution !== "none" && p.institutionId !== institution) return false;
    if (status === "published" && !p.isActive) return false;
    if (status === "draft" && p.isActive) return false;
    return true;
  });

  const activeCount = products.filter((p) => p.isActive).length;
  const hasFilters = Boolean(q || institution || status);

  return (
    <div className="max-w-[1180px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[2.25rem] text-pine">Produtos</h1>
          <p className="mt-1 text-sm text-muted">
            {activeCount} publicado{activeCount === 1 ? "" : "s"} · {products.length} ao total
          </p>
        </div>
      </div>

      <ProductFilters institutions={institutions.map((i) => ({ id: i.id, name: i.name }))} />

      <UploadPanel
        products={products.map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }))}
        institutions={institutions.map((i) => ({ id: i.id, name: i.name, isActive: i.isActive }))}
      />

      {products.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          {hasFilters ? (
            "Nenhum produto corresponde aos filtros."
          ) : (
            <>
              Nenhum produto ainda. Crie o primeiro para começar a vender.{" "}
              <span className="block text-xs opacity-80">Sem Supabase configurado, a lista é exibida vazia em modo prévia.</span>
            </>
          )}
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="pb-2 font-normal">Produto</th>
                <th className="pb-2 font-normal">Preço</th>
                <th className="pb-2 font-normal">Categoria</th>
                <th className="pb-2 font-normal">Instituição</th>
                <th className="pb-2 font-normal">Arquivos</th>
                <th className="pb-2 text-right font-normal">Pedidos</th>
                <th className="pb-2 text-right font-normal">Publicado</th>
                <th className="pb-2 text-right font-normal">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      {p.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.coverUrl} alt="" className="aspect-[4/3] w-12 shrink-0 rounded-[var(--radius-sm)] border border-line object-cover" />
                      ) : (
                        <div className="grid aspect-[4/3] w-12 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-dashed border-line text-[0.6rem] text-muted">
                          sem
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link href={`/admin/produtos/editar/${p.id}`} className="font-medium text-ink hover:text-pine">
                          {p.name}
                        </Link>
                        <p className="text-xs text-muted">
                          {p.isNew && <Badge tone="green" className="mr-1">NOVO</Badge>}
                          {p.isBestSeller && <Badge tone="amber" className="mr-1">MAIS VENDIDO</Badge>}
                          {p.isFeatured && <Badge tone="green">DESTAQUE</Badge>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 tabular">
                    {formatMoney(p.basePriceCents)}
                    {p.promoActive && <Badge tone="amber" className="ml-1">OFERTA</Badge>}
                  </td>
                  <td className="py-3 text-ink-2">{p.category ?? "—"}</td>
                  <td className="py-3 text-ink-2">{p.institution ?? "—"}</td>
                  <td className="py-3 tabular">{p.fileCount > 0 ? p.fileCount : <span className="text-danger">sem arquivo</span>}</td>
                  <td className="py-3 text-right tabular">{p.orderCount}</td>
                  <td className="py-3 text-right">
                    <form action={toggleProductFormAction.bind(null, { id: p.id, isActive: !p.isActive })}>
                      <button type="submit" className="text-sm font-medium text-pine hover:underline">
                        {p.isActive ? "Despublicar" : "Publicar"}
                      </button>
                    </form>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/produto/${p.slug}`} className="text-sm text-muted hover:text-pine">
                        Ver loja
                      </Link>
                      <DeleteProductButton id={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}