"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Totals } from "@/components/store/order-summary";
import { usePricedCart } from "@/components/store/use-priced-cart";
import { placeOrderAction } from "./actions";
import { customerDetailsSchema, cardSchema } from "@/lib/validation/schemas";
import { installmentOptions } from "@/lib/pricing";
import { maskCard, maskCep, maskCpfCnpj, maskPhone } from "@/lib/masks";
import { cn, formatMoney } from "@/lib/utils";
import type { PaymentMethod } from "@/types/domain";

type Step = 1 | 2 | 3;
type Errors = Record<string, string>;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Seus dados" },
  { n: 2, label: "Sobre o trabalho" },
  { n: 3, label: "Pagamento" },
];

export interface CheckoutDefaults {
  fullName: string;
  email: string;
  phone: string;
  cpfCnpj: string;
}

export function CheckoutForm({
  defaults,
  maxInstallments,
  minInstallmentCents,
}: {
  defaults: CheckoutDefaults;
  maxInstallments: number;
  minInstallmentCents: number;
}) {
  const router = useRouter();
  const { cart, priced, loading } = usePricedCart();
  const [step, setStep] = useState<Step>(1);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [customer, setCustomer] = useState({
    fullName: defaults.fullName,
    email: defaults.email,
    phone: maskPhone(defaults.phone),
    cpfCnpj: maskCpfCnpj(defaults.cpfCnpj),
  });
  const [notes, setNotes] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [card, setCard] = useState({
    holderName: "",
    number: "",
    expiry: "",
    ccv: "",
    postalCode: "",
    addressNumber: "",
    installments: "1",
  });

  const installments = useMemo(
    () => (priced ? installmentOptions(priced.totals.totalCents, maxInstallments, minInstallmentCents) : []),
    [priced, maxInstallments, minInstallmentCents],
  );

  function goTo(next: Step) {
    setStep(next);
    setFormError(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function validateStep1(): boolean {
    const r = customerDetailsSchema.safeParse(customer);
    if (r.success) {
      setErrors({});
      return true;
    }
    setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0] as string, i.message])));
    return false;
  }

  function validateStep2(): boolean {
    if (!acceptedTerms) {
      setErrors({ terms: "É preciso aceitar os termos para continuar." });
      return false;
    }
    setErrors({});
    return true;
  }

  function cardPayload() {
    const [mm = "", yy = ""] = card.expiry.split("/");
    return {
      holderName: card.holderName,
      number: card.number,
      expiryMonth: mm.padStart(2, "0"),
      expiryYear: yy.length === 2 ? `20${yy}` : yy,
      ccv: card.ccv,
      postalCode: card.postalCode,
      addressNumber: card.addressNumber,
      installments: Number(card.installments),
    };
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (method === "credit_card") {
      const r = cardSchema.safeParse(cardPayload());
      if (!r.success) {
        setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0] as string, i.message])));
        return;
      }
    }
    setErrors({});

    const payload = {
      method,
      customer,
      lines: cart.lines,
      couponCode: cart.couponCode ?? undefined,
      notes: notes || undefined,
      acceptedTerms,
      ...(method === "credit_card" ? { card: cardPayload() } : {}),
    };

    startTransition(async () => {
      const res = await placeOrderAction(payload);
      if (res.ok) {
        cart.clear();
        router.push(`/pedido/${res.orderId}?t=${res.accessToken}`);
        return;
      }
      setFormError(res.error);
      if (res.field?.startsWith("customer")) goTo(1);
      if (res.field === "coupon") cart.setCouponCode(null);
    });
  }

  if (!cart.ready) return <Skeleton className="h-96 w-full" />;
  if (cart.lines.length === 0) {
    return (
      <EmptyState
        title="Não há produtos para pagar"
        description="Adicione um produto ao carrinho para continuar."
        action={<ButtonLink href="/loja">Ver produtos</ButtonLink>}
      />
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
      <div>
        {/* Progresso */}
        <ol className="grid grid-cols-3 gap-3" aria-label="Etapas do pagamento">
          {STEPS.map((s) => (
            <li key={s.n}>
              <button
                type="button"
                disabled={s.n > step}
                onClick={() => s.n < step && goTo(s.n)}
                aria-current={s.n === step ? "step" : undefined}
                className={cn(
                  "w-full border-t-2 pt-3 text-left text-sm transition-colors",
                  s.n < step && "border-pine text-pine hover:text-pine-900",
                  s.n === step && "border-amber font-medium text-ink",
                  s.n > step && "border-line text-muted",
                )}
              >
                <span className="tabular">{s.n}.</span> {s.label}
              </button>
            </li>
          ))}
        </ol>

        <h2 ref={headingRef} tabIndex={-1} className="mt-10 font-serif text-[1.75rem] text-ink outline-none">
          {STEPS[step - 1].label}
        </h2>

        {formError && (
          <Alert tone="danger" role="alert" className="mt-6">
            {formError}
          </Alert>
        )}

        {step === 1 && (
          <form
            className="mt-6 grid gap-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (validateStep1()) goTo(2);
            }}
            noValidate
          >
            <Field label="Nome completo" error={errors.fullName} className="sm:col-span-2">
              {(p) => <Input {...p} autoComplete="name" value={customer.fullName} onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })} />}
            </Field>
            <Field label="E-mail" error={errors.email} hint="Enviaremos a confirmação e o acesso ao pedido.">
              {(p) => <Input {...p} type="email" autoComplete="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />}
            </Field>
            <Field label="Telefone" error={errors.phone}>
              {(p) => <Input {...p} type="tel" autoComplete="tel-national" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: maskPhone(e.target.value) })} />}
            </Field>
            <Field label="CPF ou CNPJ" error={errors.cpfCnpj} hint="Exigido para emissão da cobrança.">
              {(p) => <Input {...p} inputMode="numeric" value={customer.cpfCnpj} onChange={(e) => setCustomer({ ...customer, cpfCnpj: maskCpfCnpj(e.target.value) })} />}
            </Field>
            <div className="flex items-center justify-end sm:col-span-2">
              <Button type="submit" size="lg">Continuar</Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form
            className="mt-6 space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (validateStep2()) goTo(3);
            }}
            noValidate
          >
            <p className="max-w-[60ch] text-muted">
              Conte o que for útil para a equipe começar bem: curso, tema, norma exigida pela instituição e prazo de entrega. Os
              arquivos são enviados depois da confirmação do pagamento.
            </p>
            {cart.lines.map((l) => {
              const name = priced?.lines.find((p) => p.product.id === l.productId)?.product.name ?? "Produto";
              return (
                <Field key={l.productId} label={name} optional hint="Ex.: Pedagogia, norma ABNT, entrega na banca em 15/11.">
                  {(p) => <Textarea {...p} maxLength={1000} value={l.notes ?? ""} onChange={(e) => cart.setNotes(l.productId, e.target.value)} />}
                </Field>
              );
            })}
            <Field label="Observações gerais" optional>
              {(p) => <Textarea {...p} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />}
            </Field>

            <div>
              <label className="flex items-start gap-3 text-sm text-ink-2">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 size-4 accent-pine"
                  aria-invalid={errors.terms ? true : undefined}
                  aria-describedby={errors.terms ? "termos-erro" : undefined}
                />
                <span>
                  Li e aceito os{" "}
                  <Link href="/termos" target="_blank" className="font-medium text-pine underline underline-offset-2">
                    termos de uso
                  </Link>{" "}
                  e entendo que a Confiança presta assessoria — a autoria do trabalho é minha.
                </span>
              </label>
              {errors.terms && (
                <p id="termos-erro" role="alert" className="mt-1.5 text-xs font-medium text-danger">
                  {errors.terms}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => goTo(1)}>Voltar</Button>
              <Button type="submit" size="lg">Continuar</Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form className="mt-6" onSubmit={submit} noValidate>
            <fieldset>
              <legend className="sr-only">Forma de pagamento</legend>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["pix", "Pix", "Confirmação automática em instantes"],
                  ["credit_card", "Cartão de crédito", installments.length > 1 ? `Em até ${installments.length}x sem juros` : "À vista"],
                ] as const).map(([value, label, desc]) => (
                  <label
                    key={value}
                    className={cn(
                      "cursor-pointer rounded-[var(--radius-sm)] border px-4 py-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber",
                      method === value ? "border-pine bg-green-50" : "border-line-strong hover:border-pine/60",
                    )}
                  >
                    <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} className="sr-only" />
                    <span className="block font-medium text-ink">{label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{desc}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {method === "pix" ? (
              <p className="mt-6 max-w-[56ch] text-sm leading-relaxed text-muted">
                Ao confirmar, geramos o QR Code e o código copia e cola. O pedido é liberado assim que o banco confirmar o
                pagamento — você não precisa enviar comprovante.
              </p>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-6">
                <Field label="Número do cartão" error={errors.number} className="sm:col-span-6">
                  {(p) => <Input {...p} inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: maskCard(e.target.value) })} />}
                </Field>
                <Field label="Nome impresso no cartão" error={errors.holderName} className="sm:col-span-6">
                  {(p) => <Input {...p} autoComplete="cc-name" value={card.holderName} onChange={(e) => setCard({ ...card, holderName: e.target.value })} />}
                </Field>
                <Field label="Validade" error={errors.expiryMonth ?? errors.expiryYear} className="sm:col-span-3">
                  {(p) => (
                    <Input
                      {...p}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/AA"
                      value={card.expiry}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setCard({ ...card, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
                      }}
                    />
                  )}
                </Field>
                <Field label="CVV" error={errors.ccv} className="sm:col-span-3">
                  {(p) => <Input {...p} inputMode="numeric" autoComplete="cc-csc" value={card.ccv} onChange={(e) => setCard({ ...card, ccv: e.target.value.replace(/\D/g, "").slice(0, 4) })} />}
                </Field>
                <Field label="CEP do titular" error={errors.postalCode} className="sm:col-span-3">
                  {(p) => <Input {...p} inputMode="numeric" autoComplete="postal-code" value={card.postalCode} onChange={(e) => setCard({ ...card, postalCode: maskCep(e.target.value) })} />}
                </Field>
                <Field label="Número do endereço" error={errors.addressNumber} className="sm:col-span-3">
                  {(p) => <Input {...p} value={card.addressNumber} onChange={(e) => setCard({ ...card, addressNumber: e.target.value })} />}
                </Field>
                <Field label="Parcelas" error={errors.installments} className="sm:col-span-6">
                  {(p) => (
                    <Select {...p} value={card.installments} onChange={(e) => setCard({ ...card, installments: e.target.value })}>
                      {installments.map((o) => (
                        <option key={o.count} value={o.count}>
                          {o.count === 1 ? `À vista, ${formatMoney(o.valueCents)}` : `${o.count}x de ${formatMoney(o.valueCents)} sem juros`}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <p className="flex items-start gap-2 text-xs leading-relaxed text-muted sm:col-span-6">
                  <svg viewBox="0 0 16 16" className="mt-px size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <rect x="3" y="7" width="10" height="7" rx="1" />
                    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                  </svg>
                  Os dados do cartão vão direto ao processador de pagamentos e não são armazenados pela Confiança.
                </p>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={() => goTo(2)} disabled={pending}>Voltar</Button>
              <Button type="submit" variant="accent" size="lg" loading={pending} disabled={!priced || loading}>
                {method === "pix" ? "Gerar Pix" : "Pagar"}
                {priced && ` ${formatMoney(priced.totals.totalCents)}`}
              </Button>
            </div>
          </form>
        )}
      </div>

      <aside aria-label="Resumo do pedido" className="lg:sticky lg:top-28 lg:self-start">
        <div className="border-t-2 border-pine bg-sheet p-6">
          <h2 className="font-serif text-xl text-ink">Seu pedido</h2>
          <ul className="mt-4 space-y-3 border-b border-line pb-4 text-sm">
            {cart.lines.map((l) => {
              const p = priced?.lines.find((x) => x.product.id === l.productId);
              return (
                <li key={l.productId} className="flex justify-between gap-4">
                  <span className="text-ink-2">
                    {p?.product.name ?? "…"}
                    {p?.product.pricingUnit === "per_page" && <span className="text-muted"> ({p.quote.quantity} p.)</span>}
                  </span>
                  <span className="tabular text-ink">{p ? formatMoney(p.quote.totalCents) : ""}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <Totals priced={priced} loading={loading} />
          </div>
          {cart.couponCode && priced?.coupon?.status === "applied" && (
            <p className="mt-3 text-xs text-muted">Cupom {cart.couponCode} aplicado.</p>
          )}
          <Link href="/carrinho" className="mt-4 inline-block text-sm text-pine underline-offset-2 hover:underline">
            Editar carrinho
          </Link>
        </div>
      </aside>
    </div>
  );
}
