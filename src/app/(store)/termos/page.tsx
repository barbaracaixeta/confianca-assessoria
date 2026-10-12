import type { Metadata } from "next";
import { PolicyPage } from "@/components/store/policy-page";
export const revalidate = 300;
export const metadata: Metadata = { title: "Termos de uso" };
export default function TermsPage() {
  return <PolicyPage kind="terms" title="Termos de uso" />;
}
