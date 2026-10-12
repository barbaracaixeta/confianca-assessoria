import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ProductForm, type AdminProductValue } from "../product-form";

export const metadata: Metadata = { title: "Novo produto" };
export const dynamic = "force-dynamic";

const EMPTY: AdminProductValue = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  categoryId: null,
  basePriceCents: 9900,
  discountType: "none",
  discountValue: 0,
  promoStartsAt: null,
  promoEndsAt: null,
  productType: "digital",
  deliveryDays: 0,
  deliveryLabel: "Entrega imediata",
  sku: null,
  stockQuantity: null,
  downloadLimit: null,
  sortOrder: 0,
  isActive: true,
  isFeatured: false,
  isNew: true,
  isBestSeller: false,
  benefits: [],
  includes: [],
};

export default async function NewProductPage() {
  const admin = createSupabaseAdminClient();
  const { data: categories } = admin
    ? await admin.from("categories").select("id, name").order("sort_order").order("name")
    : { data: null };
  return (
    <div className="max-w-[880px]">
      <Link href="/admin/produtos" className="text-sm text-muted hover:text-pine">Produtos</Link>
      <h1 className="display mt-2 text-[2.25rem] text-pine">Novo produto</h1>
      <p className="mt-2 max-w-[60ch] text-sm text-muted">
        Produtos digitais são entregues automaticamente após o pagamento. Utilize este formulário também para definir selos,
        preço promocional e a ordem de exibição.
      </p>
      <div className="mt-10">
        <ProductForm product={EMPTY} categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </div>
  );
}