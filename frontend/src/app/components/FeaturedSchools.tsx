
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { typeRank } from "../lib/preferences";
import type { School } from "../data/schools";
import { BOARD_LABEL } from "../data/schools";
import { schoolPath } from "../lib/seo";
import { feeRange, lakh } from "../data/profile";
import Icon, { Stars } from "./Icon";
import CornerRibbon from "./CornerRibbon";

const BOARD_COLOR = ["bg-[#DDEAF2] text-[#0A5C91]", "bg-[#FAE5EC] text-[#C8104F]", "bg-[#E5EAF0] text-[#39506B]", "bg-[#FCE5ED] text-[#A34262]"];
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
  const [jumping, setJumping] = useState<number[]>([]); // cards that wrap round the back (no slide, just fade in)
  const curRef = useRef(0);
  const paused = useRef(false);

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
    // the list can change after the first render: start again from the first school
    curRef.current = 0;
    setCur(0);
  }, [n]);

  // auto-change every 5 s (waits while the mouse is on the cards, or the tab is hidden)
  useEffect(() => {
    if (n < 2) return;
    const id = window.setInterval(() => { if (!paused.current && !document.hidden) go(1); }, 5000);
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

  if (schools.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FAFCFD] via-[#F1F5F8] to-[#F0F4F7] py-16 sm:py-20">
      <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-[#F6D7E1]/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-10 h-80 w-80 rounded-full bg-[#D6DEE8]/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#DDEAF2] px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[#0A5C91]">
              <span className="h-2 w-2 rounded-full bg-[#0A7BBF]" />
              Handpicked for you
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0B2A47] sm:text-4xl">Featured Schools</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#5C6A7B] sm:text-base">
              Discover schools highlighted by our partners. Paid placements will be clearly identified as featured.
            </p>
          </div>

          <div className="w-fit rounded-xl border border-[#F3D9E2] bg-[#FFF0F5] px-4 py-3 text-xs font-bold text-[#C8104F]">
            ✦ Featured partner schools
          </div>
        </div>

        {compareIds.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C9D3DF] bg-white p-4">
            <p className="text-sm font-semibold text-[#0A5C91]">
              {compareIds.length} school{compareIds.length > 1 ? "s" : ""} selected for comparison
              {compareIds.length === 3 ? " (maximum reached)" : ""}
            </p>
            <button
              type="button"
              onClick={() => router.push(`/compare?ids=${compareIds.join(",")}`)}
              className="rounded-xl bg-[#0A5C91] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0B3A5C]"
            >
              Compare Now →
            </button>
          </div>
        )}
      </div>

      {/* the stage: full width, so the neighbouring cards peek out on the left and right */}
      <div
        className="vv-stage mt-10"
        role="group"
        aria-roledescription="carousel"
        aria-label="Featured schools"
        onPointerEnter={() => { paused.current = true; }}
        onPointerLeave={() => { paused.current = false; }}
        onFocusCapture={() => { paused.current = true; }}
        onBlurCapture={() => { paused.current = false; }}
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
              {/* click on a side card = go to it */}
              {side && (
                <button
                  type="button"
                  aria-label={o < 0 ? "Previous school" : "Next school"}
                  onClick={() => go(o < 0 ? -1 : 1)}
                  className="absolute inset-0 z-20 cursor-pointer rounded-3xl"
                />
              )}
              <article
                className="vv-ribbon-host group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#D9E0E8] bg-white shadow-xl shadow-[#12304A]/10 md:flex-row"
                {...(active ? {} : ({ inert: "" } as object))}
              >
                {/* photo */}
                <div className="relative h-56 shrink-0 overflow-hidden md:h-full md:w-[46%]">
                  <img
                    src={school.image}
                    alt={`${school.name} campus`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#172B32]/30 to-transparent" />
                  <CornerRibbon label="Featured" radius="1.5rem" />
                  <button
                    type="button"
                    aria-label={savedIds.includes(school.id) ? "Remove saved school" : "Save school"}
                    aria-pressed={savedIds.includes(school.id)}
                    onClick={() => toggleSaved(school.id)}
                    className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full shadow-md transition hover:scale-105 ${
                      savedIds.includes(school.id) ? "bg-[#FF9DBB] text-[#3B0B1E]" : "bg-white/95 text-[#4E5A68]"
                    }`}
                  >
                    <Icon name="heart" filled={savedIds.includes(school.id)} className={`h-5 w-5 ${savedIds.includes(school.id) ? "vv-heart" : ""}`} />
                  </button>
                </div>

                {/* details */}
                <div className="flex flex-1 flex-col p-5 sm:p-7">
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${school.color}`}>{school.board}</span>
                    <span className="rounded-lg bg-[#ECF1F5] px-2.5 py-1.5 text-[11px] font-semibold text-[#5C6A7B]">
                      {school.gender} · {school.type}
                    </span>
                  </div>

                  <h3 className="mt-4 line-clamp-2 text-xl font-extrabold text-[#0B2A47] transition group-hover:text-[#0A7BBF] sm:text-2xl">{school.name}</h3>

                  <p className="mt-2 flex items-start gap-2 text-sm text-[#687789]">
                    <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-[#0A7BBF]" />
                    <span>{school.location}</span>
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#F3F6F8] p-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#89938B]">Grades</p>
                      <p className="mt-2 text-xs font-bold leading-5 text-[#404A56]">{school.grades}</p>
                    </div>
                    <div className="border-l border-[#DBE0E5] pl-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#89938B]">Annual fees*</p>
                      <p className="mt-2 text-sm font-extrabold text-[#C8104F]">{school.fees}</p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#E2E8EE] pt-4">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#5C6A7B]">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(school.id)}
                        onChange={() => toggleCompare(school.id)}
                        className="h-4 w-4 accent-[#0A7BBF]"
                      />
                      Add to compare
                    </label>
                    <button
                      type="button"
                      onClick={() => router.push(school.href)}
                      className="vv-btn shrink-0 rounded-xl bg-[#EC0E58] px-4 py-2.5 text-xs font-extrabold text-white"
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

      {/* arrows + dots (no pause button: it changes by itself) */}
      {n > 1 && (
        <div className="relative mt-6 flex items-center justify-center gap-4">
          <button type="button" aria-label="Previous school" onClick={() => go(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D6DDE5] bg-white text-[#0A5C91] transition hover:bg-[#0A5C91] hover:text-white">
            <Icon name="chevronLeft" className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-1.5">
            {schools.map((s, i) => (
              <button key={s.id} type="button" aria-label={`Show school ${i + 1}`} onClick={() => goTo(i)} className="flex h-4 items-center">
                <i className={`block h-2 rounded-full transition-all duration-300 ${i === cur ? "w-5 bg-[#EC0E58]" : "w-2 bg-[#0B2A47]/20"}`} />
              </button>
            ))}
          </span>
          <button type="button" aria-label="Next school" onClick={() => go(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D6DDE5] bg-white text-[#0A5C91] transition hover:bg-[#0A5C91] hover:text-white">
            <Icon name="chevronRight" className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="relative mt-10 text-center">
        <p className="text-sm text-[#687789]">Looking for more schools and detailed filters?</p>
        <button
          type="button"
          onClick={() => router.push("/schools")}
          className="mt-3 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#0B2A47] to-[#41556B] px-7 py-4 text-sm font-extrabold text-white shadow-lg shadow-[#0B2A47]/20 transition hover:-translate-y-0.5 hover:shadow-xl vv-btn"
        >
          Explore More Schools
          <Icon name="arrowUpRight" className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
