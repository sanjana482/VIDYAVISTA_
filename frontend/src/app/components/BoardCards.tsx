"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BOARD_LABEL } from "../data/schools";
import { normalizeType, readPreference, savePreference, toHeroType } from "../lib/preferences";
import Icon from "./Icon";

type Row = { type: string; board: string };

const TYPES = ["Boarding School", "Day School", "Play School"] as const;
const BOARD_ORDER = ["CBSE", "ICSE", "IB", "Cambridge", "State Board", "NIOS"];

// Curriculum styling configuration
const BOARD_THEMES: Record<
  string,
  {
    bg: string;
    border: string;
    hoverBorder: string;
    shadow: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    bar: string;
    subtitle: string;
  }
> = {
  CBSE: {
    bg: "from-[#F0F7FD] via-[#F8FBFE] to-white",
    border: "border-[#D6E8F7]",
    hoverBorder: "hover:border-[#0A7BBF]",
    shadow: "hover:shadow-[#0A7BBF]/15",
    icon: "graduation",
    iconBg: "bg-[#DDEAF2]",
    iconColor: "text-[#0A5C91]",
    bar: "from-[#0A5C91] to-[#0A7BBF]",
    subtitle: "Central Board of Secondary Education",
  },
  ICSE: {
    bg: "from-[#FDF2F6] via-[#FEF8FA] to-white",
    border: "border-[#FAD6E2]",
    hoverBorder: "hover:border-[#EC0E58]",
    shadow: "hover:shadow-[#EC0E58]/15",
    icon: "book",
    iconBg: "bg-[#FCE5ED]",
    iconColor: "text-[#C8104F]",
    bar: "from-[#C8104F] to-[#EC0E58]",
    subtitle: "Council for Indian School Certificate",
  },
  IB: {
    bg: "from-[#EEFAF6] via-[#F7FCFA] to-white",
    border: "border-[#C9EFE4]",
    hoverBorder: "hover:border-[#0F7A3D]",
    shadow: "hover:shadow-[#0F7A3D]/15",
    icon: "globe",
    iconBg: "bg-[#D9F5EC]",
    iconColor: "text-[#0F7A3D]",
    bar: "from-[#0F7A3D] to-[#10B981]",
    subtitle: "International Baccalaureate",
  },
  Cambridge: {
    bg: "from-[#FFF9EE] via-[#FFFDF7] to-white",
    border: "border-[#FCE8BE]",
    hoverBorder: "hover:border-[#D97706]",
    shadow: "hover:shadow-[#D97706]/15",
    icon: "trophy",
    iconBg: "bg-[#FEF0D4]",
    iconColor: "text-[#B45309]",
    bar: "from-[#B45309] to-[#F59E0B]",
    subtitle: "Cambridge Assessment International",
  },
  "State Board": {
    bg: "from-[#F5F2FE] via-[#FAF8FE] to-white",
    border: "border-[#E1D8FA]",
    hoverBorder: "hover:border-[#7C3AED]",
    shadow: "hover:shadow-[#7C3AED]/15",
    icon: "school",
    iconBg: "bg-[#EDE6FC]",
    iconColor: "text-[#6D28D9]",
    bar: "from-[#6D28D9] to-[#8B5CF6]",
    subtitle: "State Government Syllabus",
  },
  NIOS: {
    bg: "from-[#EFF6FF] via-[#F8FAFC] to-white",
    border: "border-[#D3E4FA]",
    hoverBorder: "hover:border-[#2563EB]",
    shadow: "hover:shadow-[#2563EB]/15",
    icon: "file",
    iconBg: "bg-[#DBEAFE]",
    iconColor: "text-[#1D4ED8]",
    bar: "from-[#1D4ED8] to-[#3B82F6]",
    subtitle: "National Institute of Open Schooling",
  },
};

// number counter
function Count({ n }: { n: number }) {
  const [v, setV] = useState(n);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      setV(n);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(n);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min((t - t0) / 600, 1);
      setV(Math.round(n * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <>{v.toLocaleString("en-IN")}</>;
}

export default function BoardCards({ list }: { list: Row[] }) {
  const [type, setType] = useState<string>("Boarding School");

  // start on the saved type preference
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
    list
      .filter((s) => s.type === type)
      .forEach((s) => {
        // treat "No Board" as "IB"
        const b = s.board === "No Board" ? "IB" : s.board;
        counts.set(b, (counts.get(b) ?? 0) + 1);
      });
    const known = BOARD_ORDER.filter((b) => counts.has(b));
    const extra = Array.from(counts.keys())
      .filter((b) => !BOARD_ORDER.includes(b))
      .sort();
    return [...known, ...extra].map((b) => ({ board: b, count: counts.get(b) ?? 0 }));
  }, [list, type]);

  const total = boards.reduce((n, b) => n + b.count, 0);

  function remember() {
    const heroType = toHeroType(type);
    const saved = readPreference();
    savePreference({ type: heroType, location: saved && saved.type === heroType ? saved.location : "" });
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#F6F9FC] to-white py-14 sm:py-18">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#A6D8F5]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[#FFC2D4]/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        {/* Header with Curriculum Pill */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#FAE5EC] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#C8104F]">
              <span className="h-2 w-2 rounded-full bg-[#EC0E58]" />
              Curriculum
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#0B2A47] sm:text-3xl lg:text-4xl">
              Find schools by board
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-6 text-[#5C6A7B]">
              Filter schools by the curriculum that fits your child best.
            </p>
          </div>

          {/* School Type Segmented Pills (Mobile Friendly) */}
          <div
            className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-[#EEF2F6] p-1.5 w-full sm:w-auto shadow-inner"
            role="radiogroup"
            aria-label="School type"
          >
            {TYPES.map((t) => {
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setType(t)}
                  className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all duration-200 ${
                    active
                      ? "bg-white text-[#0A5C91] shadow-sm scale-[1.02]"
                      : "text-[#5C6A7B] hover:text-[#0B2A47] hover:bg-white/50"
                  }`}
                >
                  <span>{t}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active ? "bg-[#DDEAF2] text-[#0A5C91]" : "bg-white/80 text-[#707E8F]"
                    }`}
                  >
                    {typeCounts.get(t) ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Board Cards Responsive Grid */}
        <div className="mt-8">
          {boards.length === 0 ? (
            <p className="rounded-2xl bg-[#F1F5F8] p-6 text-sm text-[#5C6A7B] text-center">
              No {type.toLowerCase()}s listed yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {boards.map((b) => {
                const theme = BOARD_THEMES[b.board] ?? BOARD_THEMES.CBSE;
                const label = BOARD_LABEL[b.board] ?? b.board;
                const pct = total ? Math.max(10, Math.round((b.count / total) * 100)) : 10;

                return (
                  <Link
                    key={b.board}
                    href={`/schools?type=${encodeURIComponent(type)}&board=${encodeURIComponent(b.board)}`}
                    onClick={remember}
                    aria-label={`${label} ${type.toLowerCase()}s: ${b.count} schools`}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-gradient-to-br ${theme.bg} ${theme.border} ${theme.hoverBorder} p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${theme.shadow}`}
                  >
                    {/* Top Row: Icon Emblem + Arrow */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${theme.iconBg} ${theme.iconColor} shadow-sm group-hover:scale-105 transition-transform duration-300`}
                      >
                        <Icon name={theme.icon} className="h-5 w-5" />
                      </div>

                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-[#0B2A47] shadow-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-[#0B2A47] group-hover:text-white">
                        ↗
                      </span>
                    </div>

                    {/* Middle: Board Title & Subtitle */}
                    <div className="mt-4">
                      <h3 className="text-lg sm:text-xl font-extrabold text-[#0B2A47] group-hover:text-[#0A7BBF] transition-colors leading-tight">
                        {label}
                      </h3>
                      <p className="mt-1 text-xs text-[#707E8F] line-clamp-1">{theme.subtitle}</p>
                    </div>

                    {/* Bottom: Count + Percentage Progress Bar */}
                    <div className="mt-5 pt-3 border-t border-slate-200/50">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-[#0B2A47]">
                          <Count n={b.count} />
                          <span className="text-xs font-semibold text-[#5C6A7B] ml-1.5">
                            {b.count === 1 ? "school" : "schools"}
                          </span>
                        </span>
                        <span className="text-xs font-bold text-[#0A7BBF] opacity-0 group-hover:opacity-100 transition-opacity">
                          Explore →
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-200/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${theme.bar} transition-all duration-700 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
