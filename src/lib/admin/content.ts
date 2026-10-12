import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AdminBannerRow {
  id: string;
  title: string;
  subtitle: string | null;
  imagePath: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminTestimonialRow {
  id: string;
  authorName: string;
  authorDetail: string | null;
  photoPath: string | null;
  body: string;
  productId: string | null;
  productName: string | null;
  rating: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminFaqRow {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductOption {
  id: string;
  name: string;
}

function embeds(value: unknown): Array<Record<string, unknown>> | null {
  if (!value) return null;
  return (Array.isArray(value) ? value : [value]) as Array<Record<string, unknown>>;
}

export async function getAdminBanners(): Promise<AdminBannerRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("banners")
    .select("id, title, subtitle, image_path, cta_label, cta_href, starts_at, ends_at, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    imagePath: b.image_path,
    ctaLabel: b.cta_label,
    ctaHref: b.cta_href,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    isActive: b.is_active,
    sortOrder: b.sort_order,
  }));
}

export async function getAdminTestimonials(): Promise<AdminTestimonialRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("testimonials")
    .select("id, author_name, author_detail, photo_path, body, product_id, rating, is_active, sort_order, products(name)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []).map((t) => ({
    id: t.id,
    authorName: t.author_name,
    authorDetail: t.author_detail,
    photoPath: t.photo_path,
    body: t.body,
    productId: t.product_id,
    productName: (embeds(t.products)?.[0]?.name as string | undefined) ?? null,
    rating: t.rating,
    isActive: t.is_active,
    sortOrder: t.sort_order,
  }));
}

export async function getAdminFaqs(): Promise<AdminFaqRow[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("faqs")
    .select("id, question, answer, category, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []).map((f) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
    category: f.category,
    sortOrder: f.sort_order,
    isActive: f.is_active,
  }));
}

export async function getProductOptions(): Promise<ProductOption[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("products").select("id, name").order("name", { ascending: true });
  return (data ?? []).map((p) => ({ id: p.id, name: p.name }));
}
