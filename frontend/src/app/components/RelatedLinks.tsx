"use client";

// Listing ke neeche: jo location select hai, usi ke hisaab se links.
import Link from "next/link";
import { stateFor, type School } from "../data/schools";
import { cityPath, statePath } from "../lib/seo";
import { TYPE_ORDER, listingHref, typeLabel, typePath } from "../lib/links";
import { pretty } from "../lib/places";
import { useActiveLocation } from "../lib/useActiveLocation";
import type { ActiveLocation } from "../lib/locationsApi";
import ShowMore from "./ShowMore";


const row =
  "flex items-center justify-between gap-3 rounded-xl border border-[#E1E7EE] bg-white px-4 py-3 text-sm font-semibold text-[#0A5C91] transition hover:border-[#0795DC] hover:bg-[#E1F1FA]";
const pill = "shrink-0 rounded-full bg-[#EEF3F8] px-2.5 py-0.5 text-xs font-bold text-[#5C6A7B]";
const card = "rounded-2xl border border-[#E1E7EE] bg-[#F6FAFD] p-5";

/** On the listing page a click only changes the filters (no new page). Right-click / new tab still opens the clean URL. */
const inPlace = (detail: Record<string, string>) => (e: React.MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  if (!document.getElementById("results")) return;
  e.preventDefault();
  window.dispatchEvent(new CustomEvent("vv-apply-filters", { detail }));
};

function count<T>(list: T[], key: (x: T) => string) {
  const m = new Map<string, number>();
  list.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1));
  return m;
}

export default function RelatedLinks({ schools, initial }: { schools: School[]; initial?: ActiveLocation }) {
  const active = useActiveLocation(initial);

  const state = active
    ? active.kind === "state"
      ? active.name
      : stateFor(schools.find((s) => s.city === active.name) ?? { city: active.name })
    : "";
  const inState = state ? schools.filter((s) => stateFor(s) === state) : [];
  const place = active ? (active.kind === "state" ? inState : schools.filter((s) => s.city === active.name)) : [];
  const types = count(place, (s) => s.type);
  const boards = count(place, (s) => s.board);
  const cities = count(inState, (s) => s.city);
  const cityRows = [...cities.entries()]
    .filter(([c]) => active?.kind === "state" || c !== active?.name)
    .sort((a, b) => b[1] - a[1]);

  if (!active) {
    const states = [...count(schools, (s) => stateFor(s) || "Other").entries()]
      .filter(([n]) => n !== "Other")
      .sort((a, b) => b[1] - a[1]);
    if (!states.length) return null;
    return (
      <section className="mx-auto max-w-7xl px-5 pb-10 lg:px-8">
        <h2 className="text-xl font-extrabold text-[#0B2A47]">Browse schools by state</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {states.map(([n, c]) => (
            <li key={n}>
              <Link href={statePath(n)} className={row}>
                <span>Schools in {pretty(n)}</span>
                <span className={pill}>{c}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const ownKey = active.kind === "state" ? "state" : "city";
  const name = pretty(active.name);

  return (
    <section aria-label={`More schools in ${name}`} className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
      <h2 className="text-2xl font-extrabold text-[#0B2A47]">More ways to explore schools in {name}</h2>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className={card}>
          <h3 className="font-extrabold text-[#0B2A47]">By school type</h3>
          <ul className="mt-4 grid gap-2">
            {TYPE_ORDER.filter((t) => types.get(t)).map((t) => (
              <li key={t}>
                <Link href={typePath(t, active.name)} onClick={inPlace({ type: t, [ownKey]: active.name })} className={row}>
                  <span>{typeLabel(t)} in {name}</span>
                  <span className={pill}>{types.get(t)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={card}>
          <h3 className="font-extrabold text-[#0B2A47]">By board</h3>
          <ul className="mt-4 grid gap-2">
            {[...boards.entries()].sort((a, b) => b[1] - a[1]).map(([b, n]) => (
              <li key={b}>
                <Link href={listingHref({ board: b, [ownKey]: active.name })} scroll={false} onClick={inPlace({ board: b, [ownKey]: active.name })} className={row}>
                  <span>{b} schools</span>
                  <span className={pill}>{n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {cityRows.length > 0 && (
          <div className={card}>
            <h3 className="font-extrabold text-[#0B2A47]">
              {active.kind === "state" ? `Cities in ${name}` : `Other cities in ${pretty(state || "this state")}`}
            </h3>
                        <ShowMore className="mt-4 grid gap-2" initial={8} step={8}>
              {cityRows.map(([c, n]) => (
                <li key={c}>
                  <Link href={cityPath(c)} onClick={inPlace({ city: c })} className={row}>
                    <span>Schools in {pretty(c)}</span>
                    <span className={pill}>{n}</span>
                  </Link>
                </li>
              ))}
            </ShowMore>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={active.kind === "state" ? statePath(active.name) : cityPath(active.name)}
          className="rounded-full bg-[#0A5C91] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#0795DC]"
        >
          All schools in {name} →
        </Link>
        {active.kind === "city" && state && (
          <Link href={statePath(state)} className="rounded-full border border-[#D6DDE5] bg-white px-6 py-3 text-sm font-bold text-[#0A5C91] hover:border-[#0795DC]">
            Schools in {pretty(state)}
          </Link>
        )}
      </div>
    </section>
  );
}