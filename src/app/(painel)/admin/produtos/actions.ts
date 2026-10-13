"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizePermission } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import { createSupabaseAdminClient, type AdminSupabase } from "@/lib/supabase/admin";
import {
  PRODUCT_FILES_BUCKET,
  PRODUCT_MAX_BYTES,
  MAX_PRODUCT_FILE_SIZE_MB,
  displayName,
  productStorageName,
  resolveProductFileMime,
} from "@/lib/admin/product-files";
import { registerUploadedProductFile, deleteProductFile } from "@/lib/admin/product-file-upload";
import { deleteProduct } from "@/lib/admin/product-delete";
import { setProductCoverSource } from "@/lib/admin/product-covers";

export type ProductDraft = {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string | null;
  institutionId: string | null;
  basePriceCents: number;
  discountType: "none" | "percent" | "fixed" | "sale_price";
  discountValue: number;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
  productType: "digital" | "physical" | "mixed";
  deliveryDays: number;
  deliveryLabel: string | null;
  sku: string | null;
  stockQuantity: number | null;
  downloadLimit: number | null;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  benefits: string[];
  includes: string[];
};

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const draftSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "Informe o nome.").max(120),
    slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug inválido: use letras minúsculas e hífens."),
    shortDescription: z.string().trim().max(240, "Resumo muito longo."),
    description: z.string().trim(),
    categoryId: z.string().uuid().nullable().or(z.literal("").transform(() => null)),
    institutionId: z.string().uuid().nullable().or(z.literal("").transform(() => null)),
    basePriceCents: z.number().int().min(0).max(10_000_000),
    discountType: z.enum(["none", "percent", "fixed", "sale_price"]),
    discountValue: z.number().int().min(0).max(10_000_000),
    promoStartsAt: z.string().nullable(),
    promoEndsAt: z.string().nullable(),
    productType: z.enum(["digital", "physical", "mixed"]),
    deliveryDays: z.number().int().min(0).max(365),
    deliveryLabel: z.string().trim().max(80).nullable(),
    sku: z.string().trim().max(40).nullable(),
    stockQuantity: z.number().int().min(0).nullable(),
    downloadLimit: z.number().int().min(1).nullable(),
    sortOrder: z.number().int().min(0).max(9999),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    isNew: z.boolean(),
    isBestSeller: z.boolean(),
    benefits: z.array(z.string().trim()),
    includes: z.array(z.string().trim()),
  })
  .refine((d) => d.discountType !== "percent" || d.discountValue <= 100, { message: "Percentual máximo é 100.", path: ["discountValue"] })
  .refine((d) => d.discountType !== "sale_price" || d.discountValue <= d.basePriceCents, { message: "Preço promocional não pode ser maior que o preço base.", path: ["discountValue"] })
  .refine((d) => !d.promoStartsAt || !d.promoEndsAt || d.promoStartsAt < d.promoEndsAt, { message: "A promoção precisa terminar depois de começar.", path: ["promoEndsAt"] });

function normalize(d: z.infer<typeof draftSchema>) {
  const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);
  const discard = (a: string[]) => a.filter(Boolean).slice(0, 40);
  let discountValue = d.discountType === "none" ? 0 : d.discountValue;
  if (d.discountType === "percent") discountValue = Math.min(100, discountValue);
  if (d.discountType === "sale_price") discountValue = Math.min(d.basePriceCents, discountValue);
  return {
    name: d.name,
    slug: d.slug,
    short_description: d.shortDescription,
    description: d.description,
    category_id: d.categoryId,
    institution_id: d.institutionId,
    base_price_cents: d.basePriceCents,
    discount_type: d.discountType,
    discount_value: discountValue,
    promo_starts_at: d.promoStartsAt ? new Date(d.promoStartsAt).toISOString() : null,
    promo_ends_at: d.promoEndsAt ? new Date(d.promoEndsAt).toISOString() : null,
    product_type: d.productType,
    delivery_days: d.deliveryDays,
    delivery_label: clean(d.deliveryLabel),
    sku: clean(d.sku),
    stock_quantity: d.stockQuantity,
    download_limit: d.downloadLimit,
    sort_order: d.sortOrder,
    is_active: d.isActive,
    is_featured: d.isFeatured,
    is_new: d.isNew,
    is_best_seller: d.isBestSeller,
    benefits: discard(d.benefits),
    includes: discard(d.includes),
  };
}

export async function saveProductAction(input: ProductDraft): Promise<Result<{ id: string }>> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const data = normalize(parsed.data);
  if (parsed.data.id) {
    const { data: updated, error } = await admin.from("products").update(data).eq("id", parsed.data.id).select("id").single();
    if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };
    revalidateProduct(updated.id, parsed.data.slug);
    return { ok: true, data: { id: updated.id } };
  }

  const { data: created, error } = await admin
    .from("products")
    .insert({ ...data, pricing_unit: "fixed", min_quantity: 1, max_quantity: null, benefits: data.benefits, includes: data.includes })
    .select("id")
    .single();
  if (error) return { ok: false, error: `Não foi possível criar: ${error.message}` };
  revalidateProduct(created.id, parsed.data.slug);
  return { ok: true, data: { id: created.id } };
}

export async function toggleProductAction(input: { id: string; isActive: boolean }): Promise<Result> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };
  const { error } = await admin.from("products").update({ is_active: input.isActive }).eq("id", input.id);
  if (error) return { ok: false, error: `Não foi possível atualizar: ${error.message}` };
  revalidateProduct(input.id);
  return { ok: true, data: undefined };
}

/** Variante para <form action> (não pode retornar Result). */
export async function toggleProductFormAction(input: { id: string; isActive: boolean }) {
  await toggleProductAction(input);
}

function revalidateProduct(productId: string, slug?: string) {
  revalidatePath(`/admin/produtos/editar/${productId}`);
  revalidatePath("/admin/produtos");
  revalidatePath("/loja");
  revalidatePath("/");
  if (slug) revalidatePath(`/produto/${slug}`);
  else revalidatePath("/produto/[slug]", "page");
}

async function productNameAndSlug(admin: AdminSupabase, productId: string) {
  const { data } = await admin.from("products").select("name, slug").eq("id", productId).maybeSingle();
  return data as { name: string; slug: string } | null;
}

/**
 * Etapa 1 do upload: valida no servidor e devolve uma URL assinada para envio
 * direto ao Storage (o arquivo não passa pela Server Action — suporta arquivos
 * grandes e progresso individual no navegador).
 */
export async function createProductFileUploadUrlAction(input: {
  productId: string;
  fileName: string;
  sizeBytes: number;
}): Promise<Result<{ path: string; token: string; bucket: string; supabaseUrl: string }>> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = z
    .object({ productId: z.string().uuid(), fileName: z.string().min(1).max(200), sizeBytes: z.number().int() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Arquivo inválido." };
  if (parsed.data.sizeBytes <= 0) return { ok: false, error: "O arquivo está vazio." };
  if (parsed.data.sizeBytes > PRODUCT_MAX_BYTES) {
    return { ok: false, error: `O arquivo excede o tamanho máximo permitido (${MAX_PRODUCT_FILE_SIZE_MB} MB).` };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Armazenamento não configurado." };
  if (!(await productNameAndSlug(admin, parsed.data.productId))) {
    return { ok: false, error: "Este produto não está disponível." };
  }

  const path = `${parsed.data.productId}/${randomUUID()}-${productStorageName(parsed.data.fileName)}`;
  const { data, error } = await admin.storage.from(PRODUCT_FILES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Não foi possível preparar o envio. Tente novamente." };

  return {
    ok: true,
    data: { path: data.path, token: data.token, bucket: PRODUCT_FILES_BUCKET, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "" },
  };
}

/**
 * Etapa 2 do upload: confere que o objeto realmente chegou ao Storage e registra
 * no banco. Nunca confia no MIME/nome/tamanho enviados pelo navegador.
 */
export async function confirmProductFileUploadAction(input: {
  productId: string;
  path: string;
  originalName: string;
  label?: string;
}): Promise<Result<{ id: string }>> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = z
    .object({
      productId: z.string().uuid(),
      path: z.string().min(1),
      originalName: z.string().min(1).max(200),
      label: z.string().max(120).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Envio inválido." };
  if (!parsed.data.path.startsWith(`${parsed.data.productId}/`)) return { ok: false, error: "Envio inválido." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Armazenamento não configurado." };

  const product = await productNameAndSlug(admin, parsed.data.productId);
  if (!product) return { ok: false, error: "Este produto não está disponível." };

  const segments = parsed.data.path.split("/");
  const folder = segments.slice(0, -1).join("/");
  const objectName = segments[segments.length - 1];
  const { data: listed } = await admin.storage.from(PRODUCT_FILES_BUCKET).list(folder, { search: objectName, limit: 1 });
  const object = listed?.find((o) => o.name === objectName);
  const size = Number(object?.metadata?.size ?? 0);
  if (!object || size <= 0 || size > PRODUCT_MAX_BYTES) {
    if (object) await admin.storage.from(PRODUCT_FILES_BUCKET).remove([parsed.data.path]);
    return { ok: false, error: "O arquivo não chegou completo. Envie novamente." };
  }

  const originalName = displayName(parsed.data.originalName);
  const registered = await registerUploadedProductFile(admin, {
    productId: parsed.data.productId,
    bucket: PRODUCT_FILES_BUCKET,
    path: parsed.data.path,
    originalName,
    sizeBytes: size,
    mimeType: resolveProductFileMime(originalName),
    label: (parsed.data.label ?? "").trim().slice(0, 120),
  });
  if (!registered.ok) {
    await admin.storage.from(PRODUCT_FILES_BUCKET).remove([parsed.data.path]);
    return { ok: false, error: registered.error };
  }

  revalidateProduct(parsed.data.productId, product.slug);
  return { ok: true, data: { id: registered.id } };
}

export async function removeProductFileAction(input: {
  fileId: string;
  productId: string;
  slug?: string;
  force?: boolean;
}): Promise<{ ok: true; data: undefined } | { ok: false; error: string; soldOrders?: number }> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const result = await deleteProductFile(admin, input.fileId, { force: input.force });
  if (!result.ok) return { ok: false, error: result.error, soldOrders: result.soldOrders };

  revalidateProduct(input.productId, input.slug ?? "");
  return { ok: true, data: undefined };
}

export async function deleteProductAction(input: {
  id: string;
  force?: boolean;
}): Promise<{ ok: true; data: undefined } | { ok: false; error: string; soldOrders?: number }> {
  const auth = await authorizePermission("products.delete");
  if ("error" in auth) return { ok: false, error: auth.error };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const existing = await productNameAndSlug(admin, input.id);
  const result = await deleteProduct(admin, input.id, { force: input.force });
  if (!result.ok) return { ok: false, error: result.error, soldOrders: result.soldOrders };

  revalidateProduct(input.id, existing?.slug);
  return { ok: true, data: undefined };
}

async function coverAction(input: { productId: string; fileId: string }, regenerate: boolean): Promise<Result> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { data: product } = await admin.from("products").select("name, slug").eq("id", input.productId).maybeSingle();
  if (!product) return { ok: false, error: "Produto não encontrado." };

  const res = await setProductCoverSource(admin, {
    productId: input.productId,
    productName: product.name,
    fileId: input.fileId,
    regenerate,
  });
  if (!res.path) return { ok: false, error: "Não foi possível gerar a capa deste arquivo." };

  revalidateProduct(input.productId, product.slug ?? "");
  return { ok: true, data: undefined };
}

export async function setProductCoverAction(input: { productId: string; fileId: string }): Promise<Result> {
  return coverAction(input, false);
}

export async function regenerateProductPreviewAction(input: { productId: string; fileId: string }): Promise<Result> {
  return coverAction(input, true);
}

/**
 * Cria um produto direto da lista (nome + preço opcional), já publicado, para o
 * envio de arquivos. O slug é gerado a partir do nome e tornado único. O nome é
 * o título que aparece na loja e na home; demais detalhes são editados depois.
 */
export async function createProductQuickAction(input: {
  name: string;
  priceCents?: number;
  institutionId?: string | null;
}): Promise<Result<{ id: string; slug: string }>> {
  const auth = await authorizePermission("products.create");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = z
    .object({
      name: z.string().trim().min(2, "Informe o nome do produto.").max(120),
      priceCents: z.number().int().min(0).max(10_000_000).optional(),
      institutionId: z.string().uuid().nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const base = slugify(parsed.data.name) || "produto";
  let slug = base;
  for (let i = 2; i <= 30; i += 1) {
    const { data: existing } = await admin.from("products").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = `${base}-${i}`;
  }

  const { data: created, error } = await admin
    .from("products")
    .insert({
      name: parsed.data.name,
      slug,
      short_description: "",
      description: "",
      category_id: null,
      institution_id: parsed.data.institutionId ?? null,
      base_price_cents: parsed.data.priceCents ?? 0,
      discount_type: "none",
      discount_value: 0,
      promo_starts_at: null,
      promo_ends_at: null,
      product_type: "digital",
      delivery_days: 0,
      delivery_label: null,
      sku: null,
      stock_quantity: null,
      download_limit: null,
      sort_order: 0,
      is_active: true,
      is_featured: false,
      is_new: true,
      is_best_seller: false,
      benefits: [],
      includes: [],
      pricing_unit: "fixed",
      min_quantity: 1,
      max_quantity: null,
    })
    .select("id, slug")
    .single();
  if (error || !created) return { ok: false, error: `Não foi possível criar o produto: ${error?.message ?? "erro"}` };

  revalidateProduct(created.id, created.slug);
  return { ok: true, data: { id: created.id, slug: created.slug } };
}

/** Publica o produto (is_active = true). Usado no envio direto pela lista de Produtos. */
export async function publishProductAction(input: { productId: string }): Promise<Result> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = z.object({ productId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Produto inválido." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const product = await productNameAndSlug(admin, parsed.data.productId);
  if (!product) return { ok: false, error: "Produto não encontrado." };

  const { error } = await admin.from("products").update({ is_active: true }).eq("id", parsed.data.productId);
  if (error) return { ok: false, error: `Não foi possível publicar: ${error.message}` };

  revalidateProduct(parsed.data.productId, product.slug);
  return { ok: true, data: undefined };
}

/** Atualiza o rótulo exibido de um arquivo de entrega. */
export async function updateProductFileLabelAction(input: { fileId: string; label: string }): Promise<Result> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = z.object({ fileId: z.string().uuid(), label: z.string().max(120) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Arquivo inválido." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Banco de dados não configurado." };

  const { data: file } = await admin.from("product_files").select("product_id").eq("id", parsed.data.fileId).maybeSingle();
  if (!file) return { ok: false, error: "Arquivo não encontrado." };

  const { error } = await admin
    .from("product_files")
    .update({ label: parsed.data.label.trim().slice(0, 120) })
    .eq("id", parsed.data.fileId);
  if (error) return { ok: false, error: `Não foi possível salvar: ${error.message}` };

  const product = await productNameAndSlug(admin, file.product_id);
  revalidateProduct(file.product_id, product?.slug ?? "");
  return { ok: true, data: undefined };
}

/**
 * URL assinada de curta duração para o admin visualizar/baixar o arquivo de
 * entrega (o bucket é privado; nada é exposto publicamente).
 */
export async function createProductFileUrlAction(input: {
  fileId: string;
  mode?: "open" | "download";
}): Promise<Result<{ url: string }>> {
  const auth = await authorizePermission("products.edit");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = z
    .object({ fileId: z.string().uuid(), mode: z.enum(["open", "download"]).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Arquivo inválido." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Armazenamento não configurado." };

  const { data: file, error } = await admin
    .from("product_files")
    .select("bucket, path, original_name")
    .eq("id", parsed.data.fileId)
    .maybeSingle();
  if (error || !file) return { ok: false, error: "Arquivo não encontrado." };

  const options = parsed.data.mode === "download" ? { download: displayName(file.original_name) } : undefined;
  const { data: signed, error: signError } = await admin.storage.from(file.bucket).createSignedUrl(file.path, 60, options);
  if (signError || !signed) {
    return { ok: false, error: `Não foi possível gerar o link: ${signError?.message ?? "erro desconhecido"}` };
  }

  return { ok: true, data: { url: signed.signedUrl } };
}