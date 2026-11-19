// "Parent reviews in <place>": rolled up from the reviews of every school in that city / state.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon, { Stars } from "./Icon";
import type { School } from "../data/schools";
import { schoolPath } from "../lib/seo";
import { API_URL } from "../lib/api";
import { reviewSummary } from "../lib/reviews";

export { reviewSummary };

export type LocationReviewItem = {
  id?: number;
  name: string;
  role?: string;
  rating: number;
  text: string;
  date?: string;
  schoolName?: string;
  schoolUrl?: string;
};

export default function LocationReviews({ place, schools }: { place: string; schools: School[] }) {
  const { total, avg, rated } = reviewSummary(schools);
  const [liveReviews, setLiveReviews] = useState<LocationReviewItem[]>([]);

  // Fetch live reviews for this place (state or city) from the API
  useEffect(() => {
    if (!place) return;
    let mounted = true;
    fetch(`${API_URL}/reviews/?place=${encodeURIComponent(place)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data?.ok && Array.isArray(data.data)) {
          const mapped: LocationReviewItem[] = data.data.map((r: any) => ({
            id: r.id,
            name: r.name,
            role: r.role || "Parent",
            rating: r.rating,
            text: r.text,
            date: r.date,
            schoolName: r.schoolName || "",
            schoolUrl: r.schoolSlug ? `/schools/${r.schoolSlug}` : (r.schoolId ? `/schools/${r.schoolId}` : "#"),
          }));
          setLiveReviews(mapped);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [place]);

  const top = [...rated].sort((a, b) => b.reviews - a.reviews || b.rating - a.rating).slice(0, 6);

  // Merge reviews from school props (SSR) with live reviews from API
  const allReviews = useMemo(() => {
    const fromSchools: LocationReviewItem[] = schools.flatMap((s) =>
      (s.reviewList ?? []).map((r) => ({
        name: r.name,
        role: r.role || "Parent",
        rating: r.rating,
        text: r.text,
        date: r.date,
        schoolName: s.name,
        schoolUrl: schoolPath(s),
      }))
    );

    const map = new Map<string, LocationReviewItem>();
    [...liveReviews, ...fromSchools].forEach((item) => {
      const key = `${item.name}-${(item.text || "").slice(0, 30)}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return Array.from(map.values()).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [schools, liveReviews]);

  // If no reviews at all, return null
  if (!total && allReviews.length === 0) return null;

  const displayTotal = Math.max(total, allReviews.length);
  const displayAvg = avg > 0 ? avg : (allReviews.reduce((sum, r) => sum + r.rating, 0) / (allReviews.length || 1));

  return (
    <section aria-label={`Parent reviews for schools in ${place}`} className="mx-auto max-w-[1720px] px-4 sm:px-6 py-10 lg:px-8 xl:px-12">
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit rounded-full bg-[#E1F1FA] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#0A5C91]">
          Authentic Feedback
        </span>
        <h2 className="text-2xl font-extrabold text-[#0B2A47] sm:text-3xl">Parent reviews for schools in {place}</h2>
      </div>

      {/* Summary Scorecard Banner */}
      <div className="mt-5 flex flex-wrap items-center gap-6 rounded-2xl border border-[#E1E7EE] bg-gradient-to-r from-[#F6FAFD] via-white to-[#FDE8EF] p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <p className="text-5xl font-extrabold text-[#0B2A47]">
            {displayAvg.toFixed(1)}
            <span className="text-xl text-[#707E8F]"> / 5</span>
          </p>
          <div>
            <Stars value={displayAvg} className="h-5 w-5" />
            <span className="mt-0.5 block text-xs font-bold text-[#0A5C91]">Overall Community Score</span>
          </div>
        </div>
        <p className="max-w-xl leading-7 text-[#4E5A68]">
          <strong>{displayTotal.toLocaleString("en-IN")}</strong> verified parent {displayTotal === 1 ? "review" : "reviews"} across{" "}
          <strong>{Math.max(rated.length, 1)}</strong> {rated.length <= 1 ? "school" : "schools"} in {place}.
        </p>
      </div>

      {/* Most Reviewed Schools in this place */}
      {top.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#707E8F]">
            Top Reviewed in {place}:
          </span>
          <div className="flex flex-wrap gap-2.5">
            {top.map((s) => (
              <Link
                key={s.id}
                href={schoolPath(s)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E1E7EE] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0A5C91] shadow-sm transition hover:border-[#0795DC] hover:shadow-md"
              >
                <span>{s.name}{s.area ? `, ${s.area}` : ""}</span>
                <span className="flex items-center gap-1 rounded-md bg-[#FDE8EF] px-1.5 py-0.5 text-[11px] font-black text-[#C8104F]">
                  <Icon name="star" filled className="h-3 w-3" />
                  <span>{s.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-[#707E8F]">({s.reviews})</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Parent Reviews - Centered and Balanced */}
      <div className="mt-8">
        <div className="flex items-center justify-between border-b border-[#E1E7EE] pb-3">
          <div>
            <h3 className="text-lg font-extrabold text-[#0B2A47]">Parent reviews</h3>
            <p className="mt-0.5 text-xs text-[#707E8F]">Experiences shared by real parents and guardians</p>
          </div>
          <span className="rounded-full bg-[#E1F1FA] px-2.5 py-0.5 text-xs font-extrabold text-[#0A5C91]">
            {allReviews.length} {allReviews.length === 1 ? "review" : "reviews"}
          </span>
        </div>

        <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {allReviews.map((r, i) => (
            <li
              key={i}
              className="rounded-2xl border border-[#E1E7EE] bg-white p-5 shadow-sm transition hover:border-[#0795DC]/50 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                {/* Header: Avatar, Name, Verified Badge, Rating, Date */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0A5C91] to-[#0795DC] text-sm font-bold text-white shadow-sm">
                      {(r.name || "P").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-[#0B2A47]">{r.name}</p>
                        <span className="rounded-md bg-[#E1F1FA] px-2 py-0.5 text-[10px] font-extrabold text-[#0A5C91]">
                          Verified {r.role || "Parent"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#707E8F]">{r.date || "Recent"}</p>
                    </div>
                  </div>

                  {/* Star Rating Badge */}
                  <div className="flex items-center gap-1 rounded-lg bg-[#FFF9E6] border border-[#FFE8A3] px-2.5 py-1 text-xs font-black text-[#B27B00]">
                    <span>★ {Number(r.rating).toFixed(1)}</span>
                  </div>
                </div>

                {/* Review Text */}
                <p className="mt-3.5 text-sm leading-relaxed text-[#33475B]">
                  &ldquo;{r.text}&rdquo;
                </p>
              </div>

              {/* Linked School */}
              {r.schoolName && (
                <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#707E8F]">Reviewed for:</span>
                  <Link
                    href={r.schoolUrl || "#"}
                    className="text-xs font-bold text-[#0A5C91] hover:text-[#EC0E58] hover:underline truncate max-w-[280px]"
                  >
                    {r.schoolName} →
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
