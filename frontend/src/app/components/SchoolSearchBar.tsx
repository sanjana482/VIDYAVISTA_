"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { savePreference, type SchoolTypeLabel } from "../lib/preferences";

export type SearchSchool = {
  id: number;
  name: string;
  city: string;
  state?: string;
  area?: string;
  slug?: string;
  image?: string;
  logo?: string;
  board?: string;
  rating?: number;
  reviews?: number;
  fee?: number;
  type?: string;
  verified?: boolean;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSchoolUrl(s: SearchSchool): string {
  if (s.slug) return `/schools/${s.slug}`;
  const slug = slugify(`${s.name} ${s.area || ""} ${s.city || ""}`);
  return `/schools/${slug || s.id}`;
}

function formatFeeShort(fee?: number) {
  if (!fee || fee <= 0) return null;
  if (fee >= 100000) {
    const l = (fee / 100000).toFixed(1).replace(/\.0$/, "");
    return `₹${l}L/yr`;
  }
  return `₹${fee.toLocaleString("en-IN")}/yr`;
}

export default function SchoolSearchBar({
  schools = [],
  schoolType,
  location,
  className = "",
  initialQuery = "",
}: {
  schools?: SearchSchool[];
  schoolType?: string;
  location?: string;
  className?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  // Rotating search placeholder hints
  const hints = useMemo(() => {
    const top = schools.slice(0, 5).map((s) => s.name);
    return top.length > 0
      ? top
      : ["The Scindia School", "Delhi Public School", "Schools in Mumbai", "CBSE Schools"];
  }, [schools]);

  useEffect(() => {
    if (query || hints.length < 2) return;
    const timer = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % hints.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [query, hints.length]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmed = query.trim().toLowerCase();

  // Search Results Matching
  const searchResults = useMemo(() => {
    if (!trimmed) return [];

    return schools
      .filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(trimmed);
        const cityMatch = s.city.toLowerCase().includes(trimmed);
        const areaMatch = s.area ? s.area.toLowerCase().includes(trimmed) : false;
        const boardMatch = s.board ? s.board.toLowerCase().includes(trimmed) : false;
        return nameMatch || cityMatch || areaMatch || boardMatch;
      })
      .sort((a, b) => {
        // Prioritize exact start of school name
        const aStart = a.name.toLowerCase().startsWith(trimmed);
        const bStart = b.name.toLowerCase().startsWith(trimmed);
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        // Then by rating or review count
        return (b.rating || 0) - (a.rating || 0);
      })
      .slice(0, 15);
  }, [trimmed, schools]);

  // Matching Cities
  const matchingCities = useMemo(() => {
    if (trimmed.length < 2) return [];
    const cityMap = new Map<string, number>();
    schools.forEach((s) => {
      if (s.city && s.city.toLowerCase().includes(trimmed)) {
        cityMap.set(s.city, (cityMap.get(s.city) || 0) + 1);
      }
    });
    return Array.from(cityMap.entries()).slice(0, 3);
  }, [trimmed, schools]);

  // Trending / Recommended Schools (shown when user clicks before typing)
  const trendingSchools = useMemo(() => {
    return [...schools]
      .sort((a, b) => (b.reviews || 0) - (a.reviews || 0) || (b.rating || 0) - (a.rating || 0))
      .slice(0, 4);
  }, [schools]);

  // Popular Cities
  const popularCities = useMemo(() => {
    const cityMap = new Map<string, number>();
    schools.forEach((s) => {
      if (s.city) cityMap.set(s.city, (cityMap.get(s.city) || 0) + 1);
    });
    return Array.from(cityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [schools]);

  function handleSelectSchool(school: SearchSchool) {
    setIsOpen(false);
    // Auto-save location and school type to preference cookie
    const rawType = (school.type || "").toLowerCase();
    let heroType: SchoolTypeLabel = "Day Schools";
    if (rawType.includes("boarding") && !rawType.includes("day")) {
      heroType = "Boarding Schools";
    } else if (rawType.includes("play") || rawType.includes("pre")) {
      heroType = "Play School";
    }
    const loc = heroType === "Boarding Schools" ? (school.state || school.city || "") : (school.city || "");
    if (loc) {
      savePreference({ type: heroType, location: loc });
    }
    router.push(getSchoolUrl(school));
  }

  function handleSelectCity(city: string) {
    setIsOpen(false);
    const params = new URLSearchParams();
    if (schoolType) params.set("type", schoolType);
    params.set("city", city);
    router.push(`/schools?${params.toString()}`);
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setIsOpen(false);
    const q = query.trim();

    // If matches a single top school exactly, go to it
    if (searchResults.length > 0 && searchResults[0].name.toLowerCase() === q.toLowerCase()) {
      handleSelectSchool(searchResults[0]);
      return;
    }

    const params = new URLSearchParams();
    if (schoolType) params.set("type", schoolType);
    if (location) params.set("city", location);
    if (q) params.set("q", q);
    router.push(`/schools?${params.toString()}`);
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Prominent Always-Open Search Bar */}
      <form
        onSubmit={handleSubmit}
        className="relative flex h-12 sm:h-[50px] w-full items-center rounded-xl border border-[#D6DDE5] bg-white px-3 sm:px-3.5 shadow-sm transition-all duration-200 focus-within:border-[#0795DC] focus-within:ring-2 focus-within:ring-[#0795DC]/15 focus-within:shadow-md hover:border-[#B5C4D5]"
      >
        {/* Search Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center text-[#0A5C91]">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 sm:h-5 sm:w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>

        {/* Input Field with Animated Hint */}
        <div className="relative min-w-0 flex-1 px-2.5">
          {!query && (
            <span className="pointer-events-none absolute inset-0 flex items-center truncate text-xs sm:text-sm text-[#8896A6]">
              Search by school name, e.g. “{hints[hintIndex]}”
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder=""
            autoComplete="off"
            spellCheck="false"
            className="h-full w-full bg-transparent text-xs sm:text-sm font-semibold text-[#0B2A47] outline-none"
          />
        </div>

        {/* Clear Button (when text is present) */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="mr-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF2F6] text-[#707E8F] hover:bg-[#DDE3EA] hover:text-[#0B2A47]"
            aria-label="Clear search"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Prominent Search Action Button */}
        <button
          type="submit"
          className="art-btn-p flex h-8 sm:h-9 shrink-0 items-center justify-center rounded-lg px-4 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5"
        >
          <span>Search</span>
        </button>
      </form>

      {/* Rich Dropdown Panel (Ezyschooling Style) */}
      {isOpen && (
        <div className="vv-pop absolute left-0 right-0 top-full z-[99999] mt-2.5 max-h-[min(520px,75vh)] overflow-y-auto overscroll-contain rounded-2xl border border-[#D9E0E8] bg-white p-2.5 shadow-2xl shadow-[#0B2A47]/20">
          {/* Case 1: When user has typed query */}
          {trimmed ? (
            <div>
              {/* Matching Cities first if any */}
              {matchingCities.length > 0 && (
                <div className="mb-2 border-b border-[#EAEFF5] pb-2">
                  <p className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#8896A6]">
                    Locations
                  </p>
                  <div className="flex flex-wrap gap-2 px-3 pt-1">
                    {matchingCities.map(([city, count]) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleSelectCity(city)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6DDE5] bg-[#F6FAFD] px-3 py-1.5 text-xs font-bold text-[#0A5C91] transition hover:border-[#0795DC] hover:bg-[#E1F1FA]"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#EC0E58]" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>Schools in {city}</span>
                        <span className="text-[10px] text-[#707E8F]">({count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Schools Header */}
              <div className="flex items-center justify-between px-3 py-1.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#8896A6]">
                  Schools {searchResults.length > 0 && `(${searchResults.length})`}
                </p>
                <span className="text-[11px] font-semibold text-[#0795DC]">Click to view profile</span>
              </div>

              {/* School Cards List */}
              {searchResults.length > 0 ? (
                <ul className="space-y-1">
                  {searchResults.map((school) => {
                    const feeText = formatFeeShort(school.fee);
                    return (
                      <li key={school.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectSchool(school)}
                          className="group flex w-full items-center gap-3.5 rounded-xl p-2.5 text-left transition hover:bg-[#F0F7FC]"
                        >
                          {/* Thumbnail Image */}
                          <div className="relative h-12 w-12 sm:h-13 sm:w-13 shrink-0 overflow-hidden rounded-xl border border-[#DDE5ED] bg-[#E1F1FA] shadow-sm">
                            {school.image ? (
                              <img
                                src={school.image}
                                alt={school.name}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xl">
                                🏫
                              </div>
                            )}
                          </div>

                          {/* School Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="truncate text-sm font-extrabold text-[#0B2A47] group-hover:text-[#0A7BBF]">
                                {school.name}
                              </h4>
                              {school.verified && (
                                <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700">
                                  ✓ Verified
                                </span>
                              )}
                            </div>

                            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#6B7A8B]">
                              <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-[#EC0E58]" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span>
                                {school.area ? `${school.area}, ` : ""}
                                {school.city}
                              </span>
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                              {school.board && (
                                <span className="rounded bg-[#E1F1FA] px-1.5 py-0.5 font-bold text-[#0A5C91]">
                                  {school.board}
                                </span>
                              )}
                              {school.type && (
                                <span className="rounded bg-[#F4F6F9] px-1.5 py-0.5 font-semibold text-[#5C6A7B]">
                                  {school.type}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right Side: Rating & Fee */}
                          <div className="shrink-0 text-right">
                            {school.rating && school.rating > 0 ? (
                              <div className="inline-flex items-center gap-1 rounded-md bg-[#FFF3D6] px-2 py-0.5 text-xs font-black text-[#B45309]">
                                <span>★</span>
                                <span>{school.rating.toFixed(1)}</span>
                                {Boolean(school.reviews) && (
                                  <span className="text-[10px] font-normal text-[#92400E]">
                                    ({school.reviews})
                                  </span>
                                )}
                              </div>
                            ) : null}
                            {feeText && (
                              <p className="mt-1 text-[11px] font-extrabold text-[#0B2A47]">
                                {feeText}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm font-bold text-[#0B2A47]">No schools found matching &ldquo;{query}&rdquo;</p>
                  <p className="mt-1 text-xs text-[#707E8F]">Try searching by city, board, or a different school name.</p>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="mt-3 rounded-xl bg-[#0A5C91] px-4 py-2 text-xs font-bold text-white hover:bg-[#0795DC]"
                  >
                    View All Schools in Directory →
                  </button>
                </div>
              )}

              {/* Footer View All Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 border-t border-[#EAEFF5] pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A5C91] hover:text-[#0795DC]"
                  >
                    <span>View all matching results for &ldquo;{query}&rdquo;</span>
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Case 2: User focused before typing -> Show Trending Schools & Cities */
            <div>
              {/* Popular Cities */}
              {popularCities.length > 0 && (
                <div className="mb-3 border-b border-[#EAEFF5] pb-3">
                  <p className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#8896A6]">
                    Popular Education Cities
                  </p>
                  <div className="flex flex-wrap gap-2 px-3 pt-1">
                    {popularCities.map(([city, count]) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleSelectCity(city)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6DDE5] bg-[#F6FAFD] px-3 py-1.5 text-xs font-bold text-[#0A5C91] transition hover:border-[#0795DC] hover:bg-[#E1F1FA]"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#EC0E58]" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{city}</span>
                        <span className="text-[10px] text-[#707E8F]">({count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending / Recommended Schools */}
              <div>
                <p className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#8896A6]">
                  🔥 Trending &amp; Recommended Schools
                </p>
                <ul className="mt-1 space-y-1">
                  {trendingSchools.map((school) => {
                    const feeText = formatFeeShort(school.fee);
                    return (
                      <li key={school.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectSchool(school)}
                          className="group flex w-full items-center gap-3.5 rounded-xl p-2.5 text-left transition hover:bg-[#F0F7FC]"
                        >
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#DDE5ED] bg-[#E1F1FA] shadow-sm">
                            {school.image ? (
                              <img
                                src={school.image}
                                alt={school.name}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-lg">
                                🏫
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-extrabold text-[#0B2A47] group-hover:text-[#0A7BBF]">
                              {school.name}
                            </h4>
                            <p className="flex items-center gap-1 truncate text-xs text-[#6B7A8B]">
                              <span>
                                {school.area ? `${school.area}, ` : ""}
                                {school.city}
                              </span>
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            {school.rating && school.rating > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF3D6] px-2 py-0.5 text-xs font-black text-[#B45309]">
                                ★ {school.rating.toFixed(1)}
                              </span>
                            ) : null}
                            {feeText && (
                              <p className="text-[10px] font-bold text-[#707E8F]">{feeText}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
