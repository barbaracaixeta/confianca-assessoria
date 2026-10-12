import type { Metadata } from "next";
import { requireAdminArea } from "@/lib/admin/access";
import { getAdminHomeContent } from "@/lib/admin/settings-admin";
import { ContentManager } from "./content-manager";

export const metadata: Metadata = { title: "Conteúdo" };
export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requireAdminArea("admin");
  const content = await getAdminHomeContent();
  return (
    <div>
      <h1 className="display text-[2.25rem] text-pine">Conteúdo</h1>
      <p className="mt-1 text-sm text-muted">
        Textos editoriais da página inicial. Diferente dos dados institucionais, aqui você escreve os destaques da vitrine.
      </p>
      <ContentManager initial={content} />
    </div>
  );
}
