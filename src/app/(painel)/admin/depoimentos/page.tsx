import { requireAdminPermission } from "@/lib/admin/access";
import type { Metadata } from "next";
import { getAdminTestimonials, getProductOptions } from "@/lib/admin/content";
import { TestimonialManager } from "./testimonial-manager";

export const metadata: Metadata = { title: "Depoimentos" };
export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  await requireAdminPermission("content.view");
  const [testimonials, products] = await Promise.all([getAdminTestimonials(), getProductOptions()]);
  return (
    <div>
      <h1 className="display text-[2.7rem] text-pine">Depoimentos</h1>
      <p className="mt-1 text-sm text-muted">
        Avaliações de clientes exibidas na página inicial. Só depoimentos ativos aparecem no site.
      </p>
      <TestimonialManager initial={testimonials} products={products} />
    </div>
  );
}
