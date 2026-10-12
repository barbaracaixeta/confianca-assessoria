/** Acordeão nativo (details/summary): acessível por teclado e sem JavaScript. */
export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="border-t border-line">
      {items.map((item) => (
        <details key={item.question} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
            <span className="font-serif text-lg leading-snug text-ink group-open:text-pine">{item.question}</span>
            <span
              aria-hidden="true"
              className="relative mt-2 size-3 shrink-0 before:absolute before:top-1/2 before:left-0 before:h-px before:w-3 before:bg-current after:absolute after:top-0 after:left-1/2 after:h-3 after:w-px after:bg-current after:transition-transform after:duration-200 group-open:after:scale-y-0 text-green"
            />
          </summary>
          <p className="max-w-[62ch] pb-6 leading-relaxed text-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
