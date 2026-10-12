import { requireAdminPermission } from "@/lib/admin/access";
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
  institutionId: null,
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
  await requireAdminPermission("products.create");
  const admin = createSupabaseAdminClient();
  const [catRes, instRes] = admin
    ? await Promise.all([
        admin.from("categories").select("id, name").order("sort_order").order("name"),
        admin.from("institutions").select("id, name, is_active").order("sort_order").order("name"),
      ])
    : [{ data: null }, { data: null }];
  return (
    <div className="max-w-[880px]">
      <Link href="/admin/produtos" className="text-sm text-muted hover:text-pine">Produtos</Link>
      <h1 className="display mt-2 text-[2.7rem] text-pine">Novo produto</h1>
      <p className="mt-2 max-w-[60ch] text-sm text-muted">
        Produtos digitais são entregues automaticamente após o pagamento. Utilize este formulário também para definir selos,
        preço promocional e a ordem de exibição.
      </p>
      <div className="mt-10">
        <ProductForm
          product={EMPTY}
          categories={(catRes.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
          institutions={(instRes.data ?? []).map((i) => ({ id: i.id, name: i.name, isActive: i.is_active }))}
        />
      </div>
    </div>
  );
}