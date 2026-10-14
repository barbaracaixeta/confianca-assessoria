import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-12 pb-24 md:px-8">
      <p className="eyebrow text-green">Sua seleção</p>
      <h1 className="display mt-3 mb-10 text-[2.75rem] text-pine md:text-[3.5rem]">Carrinho</h1>
      <CartView />
    </div>
  );
}
