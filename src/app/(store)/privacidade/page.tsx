import type { Metadata } from "next";
import { PolicyPage } from "@/components/store/policy-page";
export const revalidate = 300;
export const metadata: Metadata = { title: "Política de privacidade" };
export default function PrivacyPage() {
  return <PolicyPage kind="privacy" title="Política de privacidade" />;
}
