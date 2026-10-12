import { requireAdminPermission } from "@/lib/admin/access";
import type { Metadata } from "next";
import { getAdminFaqs } from "@/lib/admin/content";
import { FaqManager } from "./faq-manager";

export const metadata: Metadata = { title: "FAQ" };
export const dynamic = "force-dynamic";

export default async function AdminFaqPage() {
  await requireAdminPermission("content.view");
  const faqs = await getAdminFaqs();
  return (
    <div>
      <h1 className="display text-[2.7rem] text-pine">FAQ</h1>
      <p className="mt-1 text-sm text-muted">
        Perguntas frequentes exibidas no site. Perguntas inativas ficam ocultas para os visitantes.
      </p>
      <FaqManager initial={faqs} />
    </div>
  );
}
