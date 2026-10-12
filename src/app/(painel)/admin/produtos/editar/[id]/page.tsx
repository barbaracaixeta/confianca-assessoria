import { requireAdminPermission } from "@/lib/admin/access";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/supabase/public";
import { ProductForm, ProductFiles, type AdminProductFile, type AdminProductValue } from "../../product-form";

export const metadata: Metadata = { title: "Editar produto" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: PageProps<"/admin/produtos/editar/[id]">) {
  await requireAdminPermission("products.edit");
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  if (!admin) notFound();

  const [productRes, catRes, instRes] = await Promise.all([
    admin.from("products").select("*, categories(name)").eq("id", id).maybeSingle(),
    admin.from("categories").select("id, name").order("sort_order").order("name"),
    admin.from("institutions").select("id, name, is_active").order("sort_order").order("name"),
  ]);
  const p = productRes.data;
  if (!p) notFound();

  const { data: files } = await admin
    .from("product_files")
    .select("id, original_name, mime_type, size_bytes, label, extension, preview_path, preview_status")
    .eq("product_id", id)
    .order("sort_order")
    .order("created_at");

  const value: AdminProductValue = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.short_description,
    description: p.description,
    categoryId: p.category_id,
    institutionId: p.institution_id,
    basePriceCents: p.base_price_cents,
    discountType: p.discount_type,
    discountValue: p.discount_value,
    promoStartsAt: p.promo_starts_at ? new Date(p.promo_starts_at).toISOString().slice(0, 16) : null,
    promoEndsAt: p.promo_ends_at ? new Date(p.promo_ends_at).toISOString().slice(0, 16) : null,
    productType: p.product_type,
    deliveryDays: p.delivery_days,
    deliveryLabel: p.delivery_label,
    sku: p.sku,
    stockQuantity: p.stock_quantity,
    downloadLimit: p.download_limit,
    sortOrder: p.sort_order,
    isActive: p.is_active,
    isFeatured: p.is_featured,
    isNew: p.is_new,
    isBestSeller: p.is_best_seller,
    benefits: Array.isArray(p.benefits) ? p.benefits.map(String) : [],
    includes: Array.isArray(p.includes) ? p.includes.map(String) : [],
  };

  const productFiles: AdminProductFile[] = files?.map((f) => ({
    id: f.id,
    original_name: f.original_name,
    mimeType: f.mime_type,
    size_bytes: f.size_bytes,
    label: f.label ?? "",
    previewUrl: publicStorageUrl("catalog", f.preview_path),
    previewStatus: (f.preview_status as AdminProductFile["previewStatus"]) ?? null,
  })) ?? [];

  return (
    <div className="max-w-[880px]">
      <Link href="/admin/produtos" className="text-sm text-muted hover:text-pine">Produtos</Link>
      <h1 className="display mt-2 text-[2.7rem] text-pine">{p.name}</h1>
      <Link href={`/produto/${p.slug}`} className="mt-1 inline-block text-sm text-muted tabular hover:text-pine">/produto/{p.slug}</Link>

      <div className="mt-10">
        <ProductForm
          product={value}
          categories={(catRes.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
          institutions={(instRes.data ?? []).map((i) => ({ id: i.id, name: i.name, isActive: i.is_active }))}
        />
      </div>

      <div className="mt-16 border-t border-line pt-10">
        <ProductFiles
          productId={p.id}
          files={productFiles}
          slug={p.slug}
          coverUrl={publicStorageUrl("catalog", p.image_path)}
          coverSourceFileId={p.cover_source_file_id ?? null}
        />
      </div>
    </div>
  );
}