"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BOARD_LABEL } from "../data/schools";
import { normalizeType, readPreference, savePreference, toHeroType } from "../lib/preferences";

type Row = { type: string; board: string };

const TYPES = ["Boarding School", "Day School", "Play School"] as const;
const BOARD_ORDER = ["CBSE", "ICSE", "IB", "Cambridge", "State Board", "NIOS", "No Board"];
// card tints come from the VidyaVista palette: light blue, light pink, light slate
const TINTS = [
  { card: "bg-[#EAF3F9]", mark: "text-[#0A7BBF]/15", chip: "bg-[#0A7BBF] text-white" },
  { card: "bg-[#FDEEF3]", mark: "text-[#EC0E58]/15", chip: "bg-[#EC0E58] text-white" },
  { card: "bg-[#EEF1F6]", mark: "text-[#39506B]/15", chip: "bg-[#39506B] text-white" },
];

// number that counts up when the school type is switched
function Count({ n }: { n: number }) {
  const [v, setV] = useState(n);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; setV(n); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(n); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min((t - t0) / 650, 1);
      setV(Math.round(n * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <>{v}</>;
}

export default function BoardCards({ list }: { list: Row[] }) {
  const [type, setType] = useState<string>("Boarding School");
  const trackRef = useRef<HTMLDivElement>(null);

  // start on the type the visitor chose last time (cookie)
  useEffect(() => {
    const saved = readPreference();
    const t = saved ? normalizeType(saved.type) : "";
    if (t) setType(t);
  }, []);

  const typeCounts = useMemo(() => {
    const m = new Map<string, number>();
    list.forEach((s) => m.set(s.type, (m.get(s.type) ?? 0) + 1));
    return m;
  }, [list]);

  const boards = useMemo(() => {
    const counts = new Map<string, number>();
    list.filter((s) => s.type === type).forEach((s) => counts.set(s.board, (counts.get(s.board) ?? 0) + 1));
    const known = BOARD_ORDER.filter((b) => counts.has(b));
    const extra = Array.from(counts.keys()).filter((b) => !BOARD_ORDER.includes(b)).sort();
    return [...known, ...extra].map((b) => ({ board: b, count: counts.get(b) ?? 0 }));
  }, [list, type]);
  const total = boards.reduce((n, b) => n + b.count, 0);

  // small screens: cards scroll sideways and the one in the middle grows
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const items = el.querySelectorAll<HTMLElement>("[data-board-item]");
      if (el.scrollWidth <= el.clientWidth + 4) { items.forEach((c) => c.style.setProperty("--p", "0")); return; }
      const box = el.getBoundingClientRect();
      const mid = box.left + box.width / 2;
      items.forEach((c) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--p", Math.min(Math.abs(r.left + r.width / 2 - mid) / (box.width * 0.6), 1).toFixed(3));
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [boards.length, type]);

  // remember the type (and keep the saved location only if the type is the same) -> listing opens with both ticked
  function remember() {
    const heroType = toHeroType(type);
    const saved = readPreference();
    savePreference({ type: heroType, location: saved && saved.type === heroType ? saved.location : "" });
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#F5F9FC] to-white py-16 sm:py-20">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#A6D8F5]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[#FFC2D4]/25 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-14 lg:px-8">
        {/* left: heading + school type */}
        <div className="lg:sticky lg:top-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FAE5EC] px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[#C8104F]">
            <span className="h-2 w-2 rounded-full bg-[#EC0E58]" />
            Curriculum
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0B2A47] sm:text-4xl">Find schools by board</h2>
          <p className="mt-3 text-sm leading-6 text-[#5C6A7B] sm:text-base">Filter schools by the curriculum that fits your child.</p>

          <p className="mt-7 text-xs font-extrabold uppercase tracking-wider text-[#707E8F]">School type</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row lg:flex-col" role="radiogroup" aria-label="School type">
            {TYPES.map((t) => {
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setType(t)}
                  className={`group relative flex flex-1 items-center justify-between gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left text-sm font-bold transition-all duration-300 lg:flex-none ${
                    active
                      ? "border-[#0A7BBF] bg-white text-[#0A5C91] shadow-lg shadow-[#0A7BBF]/15"
                      : "border-transparent bg-[#E9EFF4] text-[#4E5A68] hover:bg-white hover:text-[#0B2A47]"
                  }`}
                >
                  <span className={`absolute inset-y-0 left-0 w-1 bg-[#EC0E58] transition-transform duration-300 ${active ? "scale-y-100" : "scale-y-0"}`} />
                  <span className="pl-1">{t}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold transition-colors ${active ? "bg-[#DDEAF2] text-[#0A5C91]" : "bg-white/70 text-[#707E8F]"}`}>
                    {typeCounts.get(t) ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* right: one card per board */}
        <div>
          {boards.length === 0 ? (
            <p className="rounded-2xl bg-[#F1F5F8] p-6 text-sm text-[#5C6A7B]">No {type.toLowerCase()}s listed yet.</p>
          ) : (
            <div
              ref={trackRef}
              key={type}
              className="flex snap-x gap-4 overflow-x-auto px-1 pb-6 pt-2 [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible md:pb-2 [&::-webkit-scrollbar]:hidden"
            >
              {boards.map((b, i) => {
                const tint = TINTS[i % TINTS.length];
                const label = BOARD_LABEL[b.board] ?? b.board;
                const pct = total ? Math.max(8, Math.round((b.count / total) * 100)) : 0;
                return (
                  <div
                    key={b.board}
                    data-board-item
                    className="vv-board-item vv-rise w-[72%] shrink-0 snap-center sm:w-[44%] md:w-auto"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <Link
                      href={`/schools?type=${encodeURIComponent(type)}&board=${encodeURIComponent(b.board)}`}
                      onClick={remember}
                      aria-label={`${label} ${type.toLowerCase()}s: ${b.count} ${b.count === 1 ? "school" : "schools"}`}
                      className={`vv-bcard h-full min-h-[10.5rem] rounded-3xl border border-white p-5 ${tint.card}`}
                    >
                      <span className={`vv-mark pointer-events-none absolute -bottom-3 -right-1 select-none text-6xl font-black leading-none tracking-tighter ${tint.mark}`} aria-hidden>
                        {label.replace(/\s+/g, "").slice(0, 4).toUpperCase()}
                      </span>
                      <span className={`vv-go absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${tint.chip}`} aria-hidden>↗</span>

                      <span className="relative block text-xl font-extrabold text-[#0B2A47]">{label}</span>
                      <span className="relative mt-1 block text-sm text-[#5C6A7B]">
                        <Count n={b.count} /> {b.count === 1 ? "school" : "schools"}
                      </span>

                      <span className="relative mt-6 block h-1.5 overflow-hidden rounded-full bg-white/80">
                        <span className="vv-fill block h-full rounded-full bg-gradient-to-r from-[#0A7BBF] to-[#EC0E58]" style={{ width: `${pct}%` }} />
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
