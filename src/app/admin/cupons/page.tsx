import type { Metadata } from "next";
import { getAdminCoupons } from "@/lib/admin/catalog";
import { CouponManager } from "./coupon-manager";

export const metadata: Metadata = { title: "Cupons" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await getAdminCoupons();
  return (
    <div>
      <h1 className="display text-[2.25rem] text-pine">Cupons</h1>
      <p className="mt-1 text-sm text-muted">
        Cupons percentuais ou em valor fixo, com validade e limites. Eles são validados automaticamente no checkout.
      </p>
      <CouponManager initial={coupons} />
    </div>
  );
}