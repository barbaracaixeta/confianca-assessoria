import "server-only";
import { cache } from "react";
import { createSupabasePublicClient, publicStorageUrl } from "@/lib/supabase/public";
import { DEMO_CATEGORIES, DEMO_FAQS, DEMO_PRODUCTS } from "@/lib/demo/catalog-data";
import { PRODUCT_SELECT, mapCategory, mapProduct, type CategoryRow, type ProductRow } from "./mappers";
import type { Category, Product } from "@/types/domain";

const imageUrl = (path: string | null) => publicStorageUrl("catalog", path);

export const getActiveProducts = cache(async (): Promise<Product[]> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return DEMO_PRODUCTS;

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("sort_order")
    .returns<ProductRow[]>();
  if (error) throw new Error(`Falha ao carregar produtos: ${error.message}`);
  return data.map((r) => mapProduct(r, imageUrl));
});

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<ProductRow>();
  if (error) throw new Error(`Falha ao carregar produto: ${error.message}`);
  return data ? mapProduct(data, imageUrl) : null;
});

export const getProductsByCategory = cache(async (categorySlug: string, limit = 24): Promise<Product[]> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) {
    const cat = DEMO_CATEGORIES.find((c) => c.slug === categorySlug);
    return cat ? DEMO_PRODUCTS.filter((p) => p.categoryId === cat.id).slice(0, limit) : [];
  }
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("categories.slug", categorySlug)
    .order("sort_order")
    .limit(limit)
    .returns<ProductRow[]>();
  if (error) throw new Error(`Falha ao carregar produtos da categoria: ${error.message}`);
  return data.map((r) => mapProduct(r, imageUrl));
});

export const searchProducts = cache(async (query: string, limit = 24): Promise<Product[]> => {
  const q = query.trim();
  const supabase = createSupabasePublicClient();
  if (!supabase) {
    const term = q.toLowerCase();
    return DEMO_PRODUCTS.filter(
      (p) => p.name.toLowerCase().includes(term) || p.shortDescription.toLowerCase().includes(term) || p.categoryName?.toLowerCase().includes(term),
    ).slice(0, limit);
  }
  if (!q) return [];
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .ilike("name", `%${q}%`)
    .order("sort_order")
    .limit(limit)
    .returns<ProductRow[]>();
  if (error) throw new Error(`Falha na busca: ${error.message}`);
  return data.map((r) => mapProduct(r, imageUrl));
});

export const getActiveCategories = cache(async (): Promise<Category[]> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return DEMO_CATEGORIES;

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .returns<CategoryRow[]>();
  if (error) throw new Error(`Falha ao carregar categorias: ${error.message}`);
  return data.map(mapCategory);
});

export interface PublicFaq {
  question: string;
  answer: string;
  category: string;
}

export const getActiveFaqs = cache(async (): Promise<PublicFaq[]> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return DEMO_FAQS;

  const { data, error } = await supabase
    .from("faqs")
    .select("question, answer, category")
    .eq("is_active", true)
    .order("sort_order")
    .returns<PublicFaq[]>();
  if (error) throw new Error(`Falha ao carregar FAQ: ${error.message}`);
  return data;
});

export interface PublicTestimonial {
  id: string;
  authorName: string;
  authorDetail: string | null;
  body: string;
  rating: number | null;
}

/** Depoimentos só aparecem se cadastrados pelo admin — não há depoimentos inventados. */
export const getActiveTestimonials = cache(async (): Promise<PublicTestimonial[]> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("testimonials")
    .select("id, author_name, author_detail, body, rating")
    .eq("is_active", true)
    .order("sort_order")
    .limit(6);
  if (error) return [];
  return (data ?? []).map((t) => ({
    id: t.id as string,
    authorName: t.author_name as string,
    authorDetail: (t.author_detail as string | null) ?? null,
    body: t.body as string,
    rating: (t.rating as number | null) ?? null,
  }));
});


