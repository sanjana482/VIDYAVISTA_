"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { typeRank } from "../lib/preferences";
import type { School } from "../data/schools";
import { BOARD_LABEL } from "../data/schools";
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
  gender: s.gender,
  location: `${s.area}, ${s.city}`,
  grades: s.grades || "-",
  fees: feeText(s),
  image: s.image,
});

export default function HighestRatedSchools({ list }: { list: School[] }) {
  const ratedSchools = list
    .filter((s) => s.reviews > 0 && s.rating > 0)
    .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    .slice(0, 8)
    .map(toCard);

  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [savedIds, setSavedIds] = useState<number[]>([]);

  function scrollSchools(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const step = 310;
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  }

  function toggleSaved(id: number) {
    setSavedIds((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id]
    );
  }

  if (ratedSchools.length === 0) return null;

  return (
    <section className="overflow-hidden bg-gradient-to-b from-[#FCF6F8] via-[#F8F0F3] to-[#F3F8FB] py-14 sm:py-18">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {/* Heading and navigation arrows */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-[#FCDDE7] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#C8104F]">
              Parent favourites
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#0B2A47] sm:text-3xl lg:text-4xl">
              Highest Rated Schools
            </h2>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-6 text-[#626F7D]">
              Explore school ratings, parent reviews, and verified fee details.
            </p>
          </div>

          <div className="flex shrink-0 gap-2 pb-1">
            <button
              type="button"
              onClick={() => scrollSchools("left")}
              aria-label="Previous schools"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EAD3DB] bg-white text-[#C8104F] shadow-sm transition hover:border-[#C8104F] hover:bg-[#FAE5EC] hover:scale-105 active:scale-95"
            >
              <Icon name="chevronLeft" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollSchools("right")}
              aria-label="Next schools"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EAD3DB] bg-white text-[#C8104F] shadow-sm transition hover:border-[#C8104F] hover:bg-[#FAE5EC] hover:scale-105 active:scale-95"
            >
              <Icon name="chevronRight" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          className="vv-rate-track mt-8 flex snap-x snap-mandatory gap-4 sm:gap-5 overflow-x-auto scroll-smooth pb-6 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {[...ratedSchools]
            .sort((a, b) => typeRank(a.type) - typeRank(b.type))
            .map((school) => (
              <article
                key={school.id}
                className="vv-rate-card group w-[275px] sm:w-[295px] shrink-0 snap-start rounded-3xl border border-[#DDE2E8] bg-white shadow-sm transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Photo with overlays */}
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img
                      src={school.image}
                      alt={`${school.name} campus`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

                    {/* Rating Pill */}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-black text-[#0B2A47] shadow-md backdrop-blur-md border border-white/70">
                      <Icon name="star" filled className="h-3.5 w-3.5 text-[#E99A24]" />
                      <span>{school.rating.toFixed(1)}</span>
                      <span className="text-[10px] font-semibold text-[#707E8F]">({school.reviews})</span>
                    </span>

                    {/* Bookmark Button */}
                    <button
                      type="button"
                      aria-label={savedIds.includes(school.id) ? "Remove saved school" : "Save school"}
                      aria-pressed={savedIds.includes(school.id)}
                      onClick={() => toggleSaved(school.id)}
                      className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition hover:scale-105 ${
                        savedIds.includes(school.id) ? "bg-[#FF9DBB] text-[#3B0B1E]" : "bg-white text-[#C8104F]"
                      }`}
                    >
                      <Icon name="heart" filled={savedIds.includes(school.id)} className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-[#DDEAF2] px-2 py-0.5 text-[11px] font-extrabold text-[#0A5C91]">
                        {school.board}
                      </span>
                      <span className="rounded-md bg-[#FCE5ED] px-2 py-0.5 text-[11px] font-bold text-[#C8104F]">
                        {school.gender} · {school.type}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="mt-2.5 line-clamp-1 text-base sm:text-lg font-extrabold text-[#0B2A47] transition group-hover:text-[#C8104F]">
                      {school.name}
                    </h3>

                    {/* Location */}
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#707E8F] truncate">
                      <Icon name="mapPin" className="h-3.5 w-3.5 shrink-0 text-[#EC0E58]" />
                      <span className="truncate">{school.location}</span>
                    </p>

                    {/* Stars bar */}
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <Stars value={school.rating} className="h-3.5 w-3.5" />
                      <span className="font-bold text-[#0B2A47]">{school.rating.toFixed(1)}/5</span>
                    </div>

                    {/* Annual Tuition Fees Box */}
                    <div className="mt-3 rounded-xl bg-[#FFF5F8] border border-[#FCD4E2] px-3 py-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A82]">Annual Tuition</span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#C8104F]">{school.fees}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                  <button
                    type="button"
                    onClick={() => router.push(school.href)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#DDE2E8] bg-white py-2 text-xs font-extrabold text-[#0B2A47] group-hover:bg-[#C8104F] group-hover:text-white group-hover:border-transparent transition-all shadow-sm"
                  >
                    View School
                    <Icon name="chevronRight" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
        </div>
      </div>
    </section>
  );
}
