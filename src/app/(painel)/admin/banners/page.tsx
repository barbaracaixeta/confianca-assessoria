import { requireAdminPermission } from "@/lib/admin/access";
import type { Metadata } from "next";
import { getAdminBanners } from "@/lib/admin/content";
import { BannerManager } from "./banner-manager";

export const metadata: Metadata = { title: "Banners" };
export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requireAdminPermission("content.view");
  const banners = await getAdminBanners();
  return (
    <div>
      <h1 className="display text-[2.25rem] text-pine">Banners</h1>
      <p className="mt-1 text-sm text-muted">
        Destaques exibidos na página inicial. Banners inativos ou fora da vigência não aparecem para os visitantes.
      </p>
      <BannerManager initial={banners} />
    </div>
  );
}
