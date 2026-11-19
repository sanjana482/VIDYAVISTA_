"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeType, readPreference, PREF_EVENT } from "../lib/preferences";
import { typePath } from "../lib/links";
import { openLocationPicker } from "../lib/places";
import type { School } from "../data/schools";
import { BOARD_LABEL, stateFor } from "../data/schools";
import { schoolPath } from "../lib/seo";
import { feeRange, lakh } from "../data/profile";
import Icon, { Stars } from "./Icon";

const feeText = (s: School) => {
  const r = feeRange(s);
  return r.min > 0 ? `${lakh(r.min)} – ${lakh(r.max)}` : "Ask school";
};

const toCard = (s: School) => ({
  id: s.id,
  href: schoolPath(s),
  name: s.name,
  rating: s.rating,
  reviews: s.reviews,
  board: BOARD_LABEL[s.board] ?? s.board,
  type: s.type,
  location: [s.area, s.city].filter(Boolean).join(", ") || s.city,
  fees: feeText(s),
});

export default function RecommendedSchools({ list = [], allSchools = [] }: { list?: School[]; allSchools?: School[] }) {
  const [pref, setPref] = useState(readPreference());

  useEffect(() => {
    const sync = () => setPref(readPreference());
    sync();
    window.addEventListener(PREF_EVENT, sync);
    return () => window.removeEventListener(PREF_EVENT, sync);
  }, []);

  const pool = allSchools.length > 0 ? allSchools : list;
  const activeType = pref ? normalizeType(pref.type) : "Boarding School";
  const isBoarding = activeType === "Boarding School";
  const activeLoc = (pref?.location || "").trim().toLowerCase();

  let matches: School[] = [];
  if (isBoarding) {
    const boardingSchools = pool.filter((s) => s.type === "Boarding School");
    if (activeLoc) {
      const stateMatches = boardingSchools.filter(
        (s) => stateFor(s).toLowerCase() === activeLoc || s.city.toLowerCase() === activeLoc
      );
      if (stateMatches.length >= 4) {
        matches = stateMatches;
      } else {
        const otherBoarding = boardingSchools.filter(
          (s) => stateFor(s).toLowerCase() !== activeLoc && s.city.toLowerCase() !== activeLoc
        );
        matches = [...stateMatches, ...otherBoarding];
      }
    } else {
      matches = boardingSchools;
    }
  } else {
    const typeSchools = pool.filter((s) => s.type !== "Boarding School");
    if (activeLoc) {
      const cityMatches = typeSchools.filter(
        (s) => s.city.toLowerCase() === activeLoc || (s.area && s.area.toLowerCase() === activeLoc)
      );
      if (cityMatches.length >= 4) {
        matches = cityMatches;
      } else {
        const stateMatches = typeSchools.filter(
          (s) =>
            s.city.toLowerCase() !== activeLoc &&
            (!s.area || s.area.toLowerCase() !== activeLoc) &&
            stateFor(s).toLowerCase() === activeLoc
        );
        const otherDay = typeSchools.filter(
          (s) =>
            s.city.toLowerCase() !== activeLoc &&
            (!s.area || s.area.toLowerCase() !== activeLoc) &&
            stateFor(s).toLowerCase() !== activeLoc
        );
        matches = [...cityMatches, ...stateMatches, ...otherDay];
      }
    } else {
      matches = typeSchools;
    }
  }

  // Prioritize high rating and reviews
  matches.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0));

  // Ensure minimum 4 schools matching type strictly
  const seen = new Set(matches.map((s) => s.id));
  if (matches.length < 4) {
    const fallbackPool = isBoarding
      ? pool.filter((s) => s.type === "Boarding School")
      : pool.filter((s) => s.type !== "Boarding School");
    for (const s of fallbackPool) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        matches.push(s);
        if (matches.length >= 4) break;
      }
    }
  }

  const selectedList = matches.slice(0, Math.max(4, Math.min(12, matches.length)));
  const schools = selectedList.map(toCard);
  const router = useRouter();

  const handleExploreAll = () => {
    const p = readPreference();
    const type = p ? normalizeType(p.type) : "Boarding School";
    if (p?.location && type) {
      router.push(typePath(type, p.location));
    } else {
      openLocationPicker(type);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    const step = 320;
    scrollRef.current.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  }

  function toggleCompare(id: number) {
    setSelectedSchools((current) =>
      current.includes(id)
        ? current.filter((schoolId) => schoolId !== id)
        : current.length < 3
        ? [...current, id]
        : current
    );
  }

  function openCompare() {
    if (selectedSchools.length > 0) {
      router.push(`/compare?ids=${selectedSchools.join(",")}`);
    }
  }

  if (schools.length === 0) return null;

  return (
    <section className="bg-[#FAFDFE] py-12 sm:py-16 border-t border-[#E8EEF5]">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        {/* Section heading & slider buttons */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-[#DDEAF2] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#0E547C]">
              Discover schools
            </span>

            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#0B2A47] sm:text-3xl lg:text-4xl">
              Recommended Schools
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-[#626F7D]">
              Handpicked institutions recommended by our education team.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block pr-2 text-xs font-bold text-[#C8104F]">
              ✦ Picked by our team
            </span>
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scroll("left")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D6DDE5] bg-white text-[#0A5C91] shadow-sm transition hover:bg-[#0A5C91] hover:text-white"
            >
              <Icon name="chevronLeft" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scroll("right")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D6DDE5] bg-white text-[#0A5C91] shadow-sm transition hover:bg-[#0A5C91] hover:text-white"
            >
              <Icon name="chevronRight" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Slider: Compact Cards Without Big Images */}
        <div
          ref={scrollRef}
          className="mt-8 flex gap-4 sm:gap-5 overflow-x-auto scroll-smooth pb-4 pt-1 snap-x scrollbar-none"
        >
          {schools.map((school) => {
            const selected = selectedSchools.includes(school.id);

            return (
              <article
                key={school.id}
                className="group flex w-[280px] sm:w-[320px] shrink-0 snap-start flex-col justify-between rounded-2xl border border-[#DFE7EE] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#0A7BBF] hover:shadow-lg"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-lg bg-[#EBF3F9] px-2.5 py-1 text-[11px] font-bold text-[#0A5C91]">
                      {school.board}
                    </span>
                    <span className="rounded-lg bg-[#F8EFF3] px-2.5 py-1 text-[11px] font-bold text-[#C8104F]">
                      {school.type}
                    </span>
                  </div>

                  {/* School Name */}
                  <h3
                    onClick={() => router.push(school.href)}
                    className="mt-3.5 text-base sm:text-lg font-extrabold leading-snug text-[#0B2A47] line-clamp-2 cursor-pointer transition group-hover:text-[#0A7BBF]"
                  >
                    {school.name}
                  </h3>

                  {/* Location */}
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#707E8F]">
                    <Icon name="mapPin" className="h-3.5 w-3.5 shrink-0 text-[#0A7BBF]" />
                    <span className="truncate">{school.location}</span>
                  </p>

                  {/* Ratings if available */}
                  {school.rating > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                      <Stars value={school.rating} />
                      <span className="font-extrabold text-[#0B2A47]">{school.rating.toFixed(1)}</span>
                      {school.reviews > 0 && <span className="text-[#8896A6]">({school.reviews})</span>}
                    </div>
                  )}

                  {/* Fee box */}
                  <div className="mt-3.5 rounded-xl bg-[#F6FAFD] border border-[#E3EDF5] p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A8A99]">Annual fee</p>
                    <p className="text-xs sm:text-sm font-extrabold text-[#0B2A47] truncate">{school.fees}</p>
                  </div>
                </div>

                {/* Card Footer: Compare and View Link */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#EDF2F7] pt-3">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-[#687789] hover:text-[#0B2A47]">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCompare(school.id)}
                      className="h-3.5 w-3.5 accent-[#0A7BBF] rounded"
                    />
                    Compare
                  </label>

                  <button
                    type="button"
                    onClick={() => router.push(school.href)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0A7BBF] hover:text-[#084A74] transition"
                  >
                    View school →
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Compare banner if schools selected */}
        {selectedSchools.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C9D3DF] bg-white p-3.5 shadow-sm">
            <p className="text-xs sm:text-sm font-semibold text-[#0A5C91]">
              {selectedSchools.length} school{selectedSchools.length > 1 ? "s" : ""} selected for comparison
            </p>
            <button
              type="button"
              onClick={openCompare}
              className="rounded-xl bg-[#0A5C91] px-5 py-2 text-xs sm:text-sm font-bold text-white hover:bg-[#084A74] transition"
            >
              Compare selected ({selectedSchools.length}) →
            </button>
          </div>
        )}

        {/* Explore All Schools Button */}
        <div className="relative mt-8 text-center">
          <button
            type="button"
            onClick={handleExploreAll}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0B2A47] to-[#1E4366] px-6 py-3 text-xs sm:text-sm font-extrabold text-white shadow-md shadow-[#0B2A47]/15 transition hover:-translate-y-0.5 hover:shadow-lg vv-btn"
          >
            Explore All Schools
            <Icon name="arrowUpRight" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
