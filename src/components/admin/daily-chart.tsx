"use client";

import { useId, useState } from "react";
import { formatMoney } from "@/lib/utils";

interface Point {
  day: string;
  value: number;
}

const W = 640;
const H = 200;
const PAD = { top: 12, right: 8, bottom: 24, left: 8 };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");

/**
 * Série diária única (30 dias): barras para valores (faturamento) ou linha para
 * contagens (pedidos). Uma série = sem legenda; o título do cartão nomeia a série.
 * Tooltip por hover/foco em cada dia; tabela equivalente para leitores de tela.
 */
export function DailyChart({ data, kind, format }: { data: Point[]; kind: "bar" | "line"; format: "money" | "count" }) {
  const [hover, setHover] = useState<number | null>(null);
  const tableId = useId();
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / Math.max(1, data.length);
  const x = (i: number) => PAD.left + step * i + step / 2;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const fmt = (v: number) => (format === "money" ? formatMoney(v) : String(v));
  const barW = Math.max(3, step - 4);
  const linePath = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const h = hover != null ? data[hover] : null;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-describedby={tableId}>
        {/* grade recessiva: base e metade */}
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={PAD.left} x2={W - PAD.right} y1={y(max * t)} y2={y(max * t)} stroke="var(--color-line)" strokeWidth={t === 0 ? 1 : 0.75} strokeDasharray={t === 0 ? undefined : "3 4"} />
        ))}
        <text x={W - PAD.right} y={y(max) - 3} textAnchor="end" className="fill-muted text-[10px]">{fmt(max)}</text>

        {kind === "bar" &&
          data.map((d, i) => {
            const top = y(d.value);
            const bh = Math.max(0, PAD.top + innerH - top);
            const r = Math.min(4, barW / 2, bh);
            const x0 = x(i) - barW / 2;
            const base = PAD.top + innerH;
            return bh > 0 ? (
              <path
                key={d.day}
                d={`M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + barW - r}Q${x0 + barW},${top} ${x0 + barW},${top + r}V${base}Z`}
                fill={hover === i ? "var(--color-pine)" : "var(--color-green)"}
                opacity={hover == null || hover === i ? 1 : 0.55}
              />
            ) : null;
          })}

        {kind === "line" && (
          <>
            <path d={linePath} fill="none" stroke="var(--color-green)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {hover != null && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-line-strong)" />
                <circle cx={x(hover)} cy={y(data[hover].value)} r={4.5} fill="var(--color-green)" stroke="var(--color-sheet)" strokeWidth={2} />
              </>
            )}
          </>
        )}

        {/* rótulos do eixo x: início, meio e fim */}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) =>
          data[i] ? (
            <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="fill-muted text-[10px]">
              {dayLabel(data[i].day)}
            </text>
          ) : null,
        )}

        {/* áreas de interação maiores que as marcas */}
        {data.map((d, i) => (
          <rect
            key={d.day}
            x={PAD.left + step * i}
            y={PAD.top}
            width={step}
            height={innerH}
            fill="transparent"
            tabIndex={0}
            aria-label={`${dayLabel(d.day)}: ${fmt(d.value)}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="outline-none"
          />
        ))}
      </svg>

      {h && hover != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[var(--radius-sm)] border border-line bg-sheet px-2.5 py-1.5 text-xs shadow-[0_6px_16px_-10px_rgb(31_41_51/0.4)]"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <p className="text-muted">{dayLabel(h.day)}</p>
          <p className="font-medium text-ink tabular">{fmt(h.value)}</p>
        </div>
      )}

      <table id={tableId} className="sr-only">
        <tbody>
          {data.map((d) => (
            <tr key={d.day}><th>{dayLabel(d.day)}</th><td>{fmt(d.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
