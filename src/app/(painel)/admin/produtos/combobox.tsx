"use client";

import { useEffect, useRef, useState } from "react";
import { Input, control } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface ComboBoxOption {
  id: string;
  name: string;
  note?: string;
}

/** Combobox pesquisável (busca por nome, valor = id). */
export function ComboBox({
  id,
  options,
  value,
  onChange,
  emptyLabel,
  searchPlaceholder,
  ariaDescribedBy,
  invalid,
}: {
  id: string;
  options: ComboBoxOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  emptyLabel: string;
  searchPlaceholder: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const term = query.trim().toLowerCase();
  const filtered = term ? options.filter((o) => o.name.toLowerCase().includes(term)) : options;

  function choose(next: string | null) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid}
        onClick={() => setOpen((v) => !v)}
        className={cn(control, "flex h-11 items-center justify-between text-left")}
      >
        <span className={selected ? "text-ink" : "text-muted"}>{selected ? selected.name : emptyLabel}</span>
        <span aria-hidden="true" className="text-muted">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-[var(--radius-sm)] border border-line bg-sheet p-2 shadow-[var(--shadow-md)]">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9"
            aria-label={searchPlaceholder}
          />
          <ul id={`${id}-listbox`} role="listbox" className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => choose(null)}
                className={cn("w-full rounded-[var(--radius-xs)] px-2.5 py-2 text-left text-sm", !value ? "bg-green-50 text-pine" : "text-ink-2 hover:bg-paper")}
              >
                {emptyLabel}
              </button>
            </li>
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === value}
                  onClick={() => choose(o.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[var(--radius-xs)] px-2.5 py-2 text-left text-sm",
                    o.id === value ? "bg-green-50 text-pine" : "text-ink-2 hover:bg-paper",
                  )}
                >
                  {o.name}
                  {o.note && <span className="text-xs text-muted">{o.note}</span>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-2.5 py-2 text-sm text-muted">Nenhum resultado encontrado.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
