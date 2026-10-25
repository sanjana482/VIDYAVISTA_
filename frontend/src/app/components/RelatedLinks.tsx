"use client";

// Shown under the school list. Everything is connected to what the visitor selected:
//   state  -> boarding / day / day+boarding in that state, and every city of the state
//   city   -> the same for the city, its boards, other cities of the state, the state
//   none   -> all states
import Link from "next/link";
import { stateFor, type School } from "../data/schools";

import { TYPE_ORDER, listingHref, typeLabel } from "../lib/links";
import { useActiveLocation } from "../lib/useActiveLocation";

const chip = "rounded-full border border-[#D6DDE5] bg-white px-4 py-2 text-sm font-semibold text-[#0A5C91] transition hover:border-[#0795DC] hover:bg-[#E1F1FA]";

function count<T>(list: T[], key: (x: T) => string) {
  const m = new Map<string, number>();
  list.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1));
  return m;
}

export default function RelatedLinks({ schools }: { schools: School[] }) {
  const active = useActiveLocation();

  // which state does the selection belong to?
  const state = active ? (active.kind === "state" ? active.name : stateFor(schools.find((s) => s.city === active.name) ?? { city: active.name })) : "";
  const inState = state ? schools.filter((s) => stateFor(s) === state) : [];
  const place = active ? (active.kind === "state" ? inState : schools.filter((s) => s.city === active.name)) : [];
  const types = count(place, (s) => s.type);
  const boards = count(place, (s) => s.board);
  const cities = count(inState, (s) => s.city);
  const otherCities = Array.from(cities.entries()).filter(([c]) => c !== active?.name).sort((a, b) => b[1] - a[1]);

  // nothing selected -> browse all states
  if (!active) {
    const states = Array.from(count(schools, (s) => stateFor(s) || "Other").entries()).filter(([n]) => n !== "Other").sort((a, b) => b[1] - a[1]);
    if (!states.length) return null;
    return (
      <section className="mx-auto max-w-7xl px-5 pb-10 lg:px-8">
        <h2 className="text-xl font-extrabold text-[#0B2A47]">Browse schools by state</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {states.map(([n, c]) => (
            <li key={n}><Link href={listingHref({ state: n })} className={chip}>Schools in {n} <span className="text-[#8896A6]">({c})</span></Link></li>
          ))}
        </ul>
      </section>
    );
  }

  const ownKey = active.kind === "state" ? "state" : "city";
  return (
    <section aria-label={`More schools in ${active.name}`} className="mx-auto max-w-7xl px-5 pb-10 lg:px-8">
      <h2 className="text-xl font-extrabold text-[#0B2A47]">More ways to explore schools in {active.name}</h2>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-[#E1E7EE] bg-[#F6FAFD] p-5">
          <h3 className="font-extrabold text-[#0B2A47]">By school type</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {TYPE_ORDER.filter((t) => types.get(t)).map((t) => (
              <li key={t}>
                <Link href={listingHref({ type: t, [ownKey]: active.name })} scroll={false} className={chip}>
                  {typeLabel(t)} in {active.name} <span className="text-[#8896A6]">({types.get(t)})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[#E1E7EE] bg-[#F6FAFD] p-5">
          <h3 className="font-extrabold text-[#0B2A47]">By board</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {Array.from(boards.entries()).sort((a, b) => b[1] - a[1]).map(([b, n]) => (
              <li key={b}>
                <Link href={listingHref({ board: b, [ownKey]: active.name })} scroll={false} className={chip}>
                  {b} schools in {active.name} <span className="text-[#8896A6]">({n})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

    
      {(active.kind === "state" ? Array.from(cities.entries()).sort((a, b) => b[1] - a[1]) : otherCities).length > 0 && (
        <div className="mt-5 rounded-2xl border border-[#E1E7EE] bg-[#F6FAFD] p-5">
          <h3 className="font-extrabold text-[#0B2A47]">
            {active.kind === "state" ? `Cities in ${active.name}` : `Other cities in ${state || "this state"}`}
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {(active.kind === "state" ? Array.from(cities.entries()).sort((a, b) => b[1] - a[1]) : otherCities).map(([c, n]) => (
              <li key={c}>
                <Link href={listingHref({ city: c })} className={chip}>
                  Schools in {c} <span className="text-[#8896A6]">({n})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}


      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={listingHref({ [ownKey]: active.name })} className="rounded-full bg-[#0A5C91] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0795DC]">
          All schools in {active.name} →
        </Link>
        {active.kind === "city" && state && (
          <Link href={listingHref({ state })} className={chip}>Schools in {state}</Link>
        )}
      </div>
    </section>
  );
}
