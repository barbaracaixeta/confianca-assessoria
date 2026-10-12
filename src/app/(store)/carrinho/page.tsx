import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-5 pt-12 pb-24 md:px-8">
      <h1 className="display mb-10 text-[2.75rem] text-pine md:text-[3.5rem]">Carrinho</h1>
      <CartView />
    </div>
  );
}
