"use client";

import { useState } from "react";
import type { Pair } from "../_lib/types";

/** Last-N-days column chart with hover tooltip. */
export function DailyBars({ data }: { data: { date: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 190, padL = 28, padB = 26, padT = 12;
  const max = Math.max(4, ...data.map((d) => d.value));
  const step = (W - padL) / data.length;
  const bw = Math.min(26, step * 0.6);
  const ticks = [0, Math.round(max / 2), max];
  const label = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Enquiries in the last 14 days">
        {ticks.map((t) => {
          const y = padT + (H - padT - padB) * (1 - t / max);
          return (
            <g key={t}>
              <line x1={padL} x2={W} y1={y} y2={y} stroke="#E1E7EE" strokeDasharray="3 4" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#8896A6">{t}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = ((H - padT - padB) * d.value) / max;
          const x = padL + i * step + (step - bw) / 2;
          const y = H - padB - h;
          const isLast = i === data.length - 1;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + i * step} y={padT} width={step} height={H - padT - padB} fill="transparent" />
              <rect x={x} y={d.value ? y : H - padB - 2} width={bw} height={d.value ? h : 2} rx={5} fill={isLast ? "#EC0E58" : hover === i ? "#0A5C91" : "#0795DC"} opacity={d.value ? 1 : 0.3} />
              {(i % 2 === 0 || isLast) && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="9.5" fill="#8896A6">{label(d.date)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-lg bg-[#0B2A47] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          {label(data[hover].date)} · {data[hover].value} enquir{data[hover].value === 1 ? "y" : "ies"}
        </div>
      )}
    </div>
  );
}

/** Donut with centre total + legend. */
export function Donut({ parts, centerLabel }: { parts: { label: string; value: number; color: string }[]; centerLabel: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={centerLabel}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#EEF2F6" strokeWidth="16" />
        {total > 0 &&
          parts.map((p) => {
            const len = (p.value / total) * C;
            const el = (
              <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
            );
            offset += len;
            return el;
          })}
        <text x="70" y="68" textAnchor="middle" fontSize="24" fontWeight="800" fill="#0B2A47">{total}</text>
        <text x="70" y="85" textAnchor="middle" fontSize="9.5" fill="#8896A6">{centerLabel}</text>
      </svg>
      <ul className="space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
            <span className="w-24 text-[#4E5A68]">{p.label}</span>
            <b className="text-[#0B2A47]">{p.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars for rankings. */
export function HBars({ items, color = "#0795DC", empty = "No data yet" }: { items: Pair[]; color?: string; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-6 text-center text-sm text-[#8896A6]">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate font-medium text-[#0B2A47]">{i.label}</span>
            <b className="text-[#0A5C91]">{i.value}</b>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#EEF2F6]">
            <div className="h-full rounded-full transition-all" style={{ width: `${(i.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
