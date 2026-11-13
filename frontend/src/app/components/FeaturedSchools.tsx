"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { School } from "../data/schools";
import { BOARD_LABEL } from "../data/schools";
import { schoolPath } from "../lib/seo";
import { feeRange, lakh } from "../data/profile";
import Icon from "./Icon";

const BOARD_COLOR = [
  "bg-[#DDEAF2] text-[#0A5C91]",
  "bg-[#FAE5EC] text-[#C8104F]",
  "bg-[#E5EAF0] text-[#39506B]",
  "bg-[#FCE5ED] text-[#A34262]",
];

const feeText = (s: School) => {
  const r = feeRange(s);
  return r.min > 0 ? `${lakh(r.min)} – ${lakh(r.max)}` : "Ask school";
};

const toCard = (s: School, i: number) => ({
  id: s.id,
  href: schoolPath(s),
  name: s.name,
  board: BOARD_LABEL[s.board] ?? s.board,
  type: s.type,
  gender: s.gender,
  location: `${s.area}, ${s.city}`,
  grades: s.grades || "-",
  fees: feeText(s),
  image: s.image,
  color: BOARD_COLOR[i % BOARD_COLOR.length],
});

export default function FeaturedSchools({ list }: { list: School[] }) {
  const schools = list.map(toCard);
  const router = useRouter();
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [savedIds, setSavedIds] = useState<number[]>([]);

  // ---- carousel: `cur` is the school in the middle, its neighbours peek out on both sides ----
  const n = schools.length;
  const [cur, setCur] = useState(0);
  const [jumping, setJumping] = useState<number[]>([]);
  const curRef = useRef(0);
  const paused = useRef(false);
  const touchStartX = useRef(0);

  const offset = (idx: number, c: number) => {
    let o = (((idx - c) % n) + n) % n;
    if (o > n / 2) o -= n;
    return o;
  };

  const go = (dir: 1 | -1) => {
    if (n < 2) return;
    const from = curRef.current;
    const to = (from + dir + n) % n;
    const wrap = schools.map((_, i) => i).filter((i) => Math.abs(offset(i, to) - offset(i, from)) > 1);
    curRef.current = to;
    setJumping(wrap);
    setCur(to);
    if (wrap.length) window.setTimeout(() => setJumping([]), 60);
  };

  const goTo = (i: number) => {
    if (i === curRef.current) return;
    curRef.current = i;
    setJumping([]);
    setCur(i);
  };

  useEffect(() => {
    curRef.current = 0;
    setCur(0);
  }, [n]);

  // auto-change every 5 s
  useEffect(() => {
    if (n < 2) return;
    const id = window.setInterval(() => {
      if (!paused.current && !document.hidden) go(1);
    }, 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  function toggleCompare(id: number) {
    setCompareIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current
    );
  }
  function toggleSaved(id: number) {
    setSavedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    paused.current = true;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    paused.current = false;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      go(diff > 0 ? 1 : -1);
    }
  }

  if (schools.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FAFCFD] via-[#F1F5F8] to-[#F0F4F7] py-14 sm:py-18">
      <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-[#F6D7E1]/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-10 h-80 w-80 rounded-full bg-[#D6DEE8]/30 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#DDEAF2] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#0A5C91]">
              <span className="h-2 w-2 rounded-full bg-[#0A7BBF]" />
              Handpicked for you
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#0B2A47] sm:text-3xl lg:text-4xl">Featured Schools</h2>
            <p className="mt-2 max-w-xl text-xs sm:text-sm leading-6 text-[#5C6A7B]">
              Discover schools highlighted by our verified partners.
            </p>
          </div>

          <div className="w-fit rounded-full border border-[#F3D9E2] bg-[#FFF0F5] px-3.5 py-1.5 text-xs font-bold text-[#C8104F] shadow-sm">
            ✦ Featured partner schools
          </div>
        </div>

        {compareIds.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C9D3DF] bg-white p-3.5 shadow-sm">
            <p className="text-xs sm:text-sm font-semibold text-[#0A5C91]">
              {compareIds.length} school{compareIds.length > 1 ? "s" : ""} selected for comparison
              {compareIds.length === 3 ? " (maximum reached)" : ""}
            </p>
            <button
              type="button"
              onClick={() => router.push(`/compare?ids=${compareIds.join(",")}`)}
              className="rounded-xl bg-[#0A5C91] px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-[#0B3A5C] transition-colors"
            >
              Compare Now →
            </button>
          </div>
        )}
      </div>

      {/* carousel stage */}
      <div
        className="vv-stage mt-8 sm:mt-10"
        role="group"
        aria-roledescription="carousel"
        aria-label="Featured schools"
        onPointerEnter={() => { paused.current = true; }}
        onPointerLeave={() => { paused.current = false; }}
        onFocusCapture={() => { paused.current = true; }}
        onBlurCapture={() => { paused.current = false; }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {schools.map((school, idx) => {
          const o = offset(idx, cur);
          const active = o === 0;
          const side = Math.abs(o) === 1;
          return (
            <div
              key={school.id}
              className="vv-slide"
              style={{ ["--o" as string]: o, ["--a" as string]: Math.min(Math.abs(o), 1) } as React.CSSProperties}
              data-side={side ? "" : undefined}
              data-far={Math.abs(o) > 1 ? "" : undefined}
              data-jump={jumping.includes(idx) ? "" : undefined}
              aria-hidden={active ? undefined : true}
            >
              {/* click on side peek card activates it */}
              {side && (
                <button
                  type="button"
                  aria-label={o < 0 ? "Previous school" : "Next school"}
                  onClick={() => go(o < 0 ? -1 : 1)}
                  className="absolute inset-0 z-20 cursor-pointer rounded-3xl"
                />
              )}
              <article
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#D9E0E8] bg-white shadow-xl shadow-[#12304A]/8 md:flex-row transition-all duration-300"
                {...(active ? {} : ({ inert: "" } as object))}
              >
                {/* Photo container */}
                <div className="relative h-44 sm:h-52 md:h-full md:w-[38%] shrink-0 overflow-hidden bg-slate-100">
                  <img
                    src={school.image}
                    alt={`${school.name} campus`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

                  {/* Featured Badge Pill */}
                  <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#EC0E58] to-[#C8104F] px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md backdrop-blur-sm">
                    ✦ Featured
                  </span>

                  {/* Bookmark Button */}
                  <button
                    type="button"
                    aria-label={savedIds.includes(school.id) ? "Remove saved school" : "Save school"}
                    aria-pressed={savedIds.includes(school.id)}
                    onClick={() => toggleSaved(school.id)}
                    className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition hover:scale-105 ${
                      savedIds.includes(school.id) ? "bg-[#FF9DBB] text-[#3B0B1E]" : "bg-white/95 text-[#4E5A68]"
                    }`}
                  >
                    <Icon name="heart" filled={savedIds.includes(school.id)} className={`h-4 w-4 ${savedIds.includes(school.id) ? "vv-heart" : ""}`} />
                  </button>
                </div>

                {/* Details container */}
                <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 md:p-6">
                  <div>
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold ${school.color}`}>
                        {school.board}
                      </span>
                      <span className="rounded-md bg-[#ECF1F5] px-2 py-0.5 text-[11px] font-semibold text-[#5C6A7B]">
                        {school.gender} · {school.type}
                      </span>
                    </div>

                    {/* School Name */}
                    <h3 className="mt-2.5 line-clamp-1 sm:line-clamp-2 text-base sm:text-lg md:text-xl font-extrabold text-[#0B2A47] transition group-hover:text-[#0A7BBF] leading-snug">
                      {school.name}
                    </h3>

                    {/* Location */}
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#687789]">
                      <Icon name="mapPin" className="h-3.5 w-3.5 shrink-0 text-[#0A7BBF]" />
                      <span className="truncate">{school.location}</span>
                    </p>

                    {/* Grades & Fees compact box */}
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#F4F7F9] p-2.5 sm:p-3 border border-[#E8EFF4]">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#89938B]">Grades</p>
                        <p className="mt-0.5 text-xs font-bold text-[#404A56] truncate">{school.grades}</p>
                      </div>
                      <div className="border-l border-[#D9E1E8] pl-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#89938B]">Annual fees*</p>
                        <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-[#C8104F] truncate">{school.fees}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E8EFF4] pt-3">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#5C6A7B] hover:text-[#0B2A47]">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(school.id)}
                        onChange={() => toggleCompare(school.id)}
                        className="h-3.5 w-3.5 accent-[#0A7BBF] rounded"
                      />
                      Add to compare
                    </label>
                    <button
                      type="button"
                      onClick={() => router.push(school.href)}
                      className="vv-btn shrink-0 rounded-xl bg-gradient-to-r from-[#EC0E58] to-[#C8104F] px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:shadow-md transition-all"
                    >
                      View School ↗
                    </button>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      {/* Navigation Controls: Arrows + Dots */}
      {n > 1 && (
        <div className="relative mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous school"
            onClick={() => go(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D6DDE5] bg-white text-[#0A5C91] shadow-sm transition hover:bg-[#0A5C91] hover:text-white hover:scale-105 active:scale-95"
          >
            <Icon name="chevronLeft" className="h-4 w-4" />
          </button>
          <span className="flex items-center gap-1.5">
            {schools.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Show school ${i + 1}`}
                onClick={() => goTo(i)}
                className="flex h-4 items-center"
              >
                <i
                  className={`block h-2 rounded-full transition-all duration-300 ${
                    i === cur ? "w-5 bg-[#EC0E58] shadow-sm" : "w-2 bg-[#0B2A47]/20 hover:bg-[#0B2A47]/40"
                  }`}
                />
              </button>
            ))}
          </span>
          <button
            type="button"
            aria-label="Next school"
            onClick={() => go(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D6DDE5] bg-white text-[#0A5C91] shadow-sm transition hover:bg-[#0A5C91] hover:text-white hover:scale-105 active:scale-95"
          >
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative mt-8 text-center">
        <button
          type="button"
          onClick={() => router.push("/schools")}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0B2A47] to-[#1E4366] px-6 py-3 text-xs sm:text-sm font-extrabold text-white shadow-md shadow-[#0B2A47]/15 transition hover:-translate-y-0.5 hover:shadow-lg vv-btn"
        >
          Explore All Schools
          <Icon name="arrowUpRight" className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
