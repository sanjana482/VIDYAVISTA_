"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { stateFor } from "../../data/schools";
import { countBy, needsPlace } from "../../lib/finder";
import { scopeBase, scopeHeading, scopeSchools, type Place, type Scope, type TypeKey } from "../../lib/browse";
import { TYPE_PATH } from "../../lib/links";
import { pretty } from "../../lib/places";
import { slugify } from "../../lib/seo";
import ScopeSections from "../browse/ScopeSections";
import { useFinder } from "./FinderProvider";

/**
 * Filter hub with Jump to [Gender] [Fees] [Board] [Area].
 * Follows active type & location:
 *  - Boarding: Boarding schools in India / <state> / <city> -> by gender, fees, board, state, city
 *  - Day / Play: <Day schools in City> -> by gender, fees, board, area
 */
export default function BrowseSections() {
  const { schools, f, set } = useFinder();

  const boardingCount = useMemo(() => schools.filter((s) => s.type === "Boarding School").length, [schools]);
  const dayCities = useMemo(() => countBy(schools.filter((s) => s.type === "Day School"), (s) => s.city).slice(0, 14), [schools]);

  const place: Place = f.city ? { kind: "city", name: f.city } : f.state ? { kind: "state", name: f.state } : null;
  const type = (f.type || "Day School") as TypeKey;
  const scope: Scope | null = type && (!needsPlace(type) || place) ? { type, place } : null;

  const dayPlaceChoices = useMemo(
    () => (needsPlace(type) ? countBy(schools.filter((s) => s.type === type), (s) => s.city).slice(0, 18) : []),
    [schools, type]
  );

  const total = scope ? scopeSchools(schools, scope).length : 0;

  return (
    <section id="browse" className="scroll-mt-20 bg-white py-12 sm:py-16 border-b border-[#E8EEF5]">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        {/* Scope selected: show the stacked Jump to categories */}
        {scope ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#EAF4FB] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#0A5C91]">
                  Which school fits your child?
                </span>
                <p className="mt-2 text-sm font-bold text-[#0A7BBF]">
                  {total.toLocaleString("en-IN")} {total === 1 ? "school" : "schools"}
                </p>
                <h2 className="vv-display text-3xl font-extrabold leading-tight text-[#0B2A47] sm:text-4xl">
                  {scopeHeading(scope)}
                </h2>
              </div>
              <Link
                href={scopeBase(scope)}
                className="vv-btn inline-flex h-11 items-center gap-2 rounded-xl bg-[#0A5C91] px-5 text-sm font-extrabold text-white shadow-sm hover:bg-[#084A74] transition"
              >
                Open the full list <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <ScopeSections schools={schools} scope={scope} showTotal={false} className="mt-6" />
          </>
        ) : (
          /* Day / play school, no city chosen yet */
          <>
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#EAF4FB] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#0A5C91]">
                Which school fits your child?
              </span>
              <h2 className="vv-display mt-3 text-3xl font-extrabold leading-tight text-[#0B2A47] sm:text-4xl">
                Which city are you looking in?
              </h2>
              <p className="mt-2 text-[#4A5C70]">
                {type}s are shown city by city, so you only see schools your child can actually reach.
              </p>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2.5">
              {dayPlaceChoices.map((c) => (
                <li key={c.value}>
                  <button
                    type="button"
                    onClick={() => set("city", c.value)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#D6DDE5] bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A47] transition hover:border-[#0795DC] hover:bg-[#F3F8FC]"
                  >
                    <MapPin className="h-4 w-4 text-[#EC0E58]" aria-hidden />
                    {pretty(c.value)}
                    <span className="text-xs font-semibold text-[#8896A6]">{c.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
