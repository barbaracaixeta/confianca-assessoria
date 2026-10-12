import type { Metadata } from "next";
import { getAdminCategories } from "@/lib/admin/catalog";
import { CategoryManager } from "./category-manager";

export const metadata: Metadata = { title: "Categorias" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
  return (
    <div>
      <h1 className="display text-[2.25rem] text-pine">Categorias</h1>
      <p className="mt-1 text-sm text-muted">
        Organize a loja. Categorias inativas são ocultadas do menu e da página inicial, mas continuam válidas para produtos já cadastrados.
      </p>
      <CategoryManager initial={categories} />
    </div>
  );
}