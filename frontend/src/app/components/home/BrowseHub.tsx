"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BOARDS, BOARD_LABEL, GENDERS, stateFor, type School } from "../../data/schools";
import { FEE_BANDS, GENDER_LABEL, countBy } from "../../lib/finder";
import { listingHref } from "../../lib/links";

type Tab = "city" | "state" | "area" | "board" | "gender" | "fees";
type Row = { key: string; label: string; sub?: string; count: number; href: string };

const TABS: { id: Tab; label: string }[] = [
  { id: "city", label: "City" },
  { id: "state", label: "State or region" },
  { id: "area", label: "Area" },
  { id: "board", label: "Board" },
  { id: "gender", label: "Gender" },
  { id: "fees", label: "Annual fees" },
];

const SCOPES = [
  { value: "", label: "All types" },
  { value: "Day School", label: "Day" },
  { value: "Boarding School", label: "Boarding" },
  { value: "Play School", label: "Play school" },
];

const BOARD_NOTE: Record<string, string> = {
  CBSE: "Central Board of Secondary Education",
  ICSE: "Council for the Indian School Certificate Examinations",
  IB: "International Baccalaureate programmes",
  Cambridge: "Cambridge IGCSE and A Level",
  "State Board": "Your state’s own curriculum",
  NIOS: "National Institute of Open Schooling",
};

const LIMIT = 12;

export default function BrowseHub({ schools }: { schools: School[] }) {
  const [tab, setTab] = useState<Tab>("city");
  const [scope, setScope] = useState("");
  const [all, setAll] = useState(false);

  const pool = useMemo(() => (scope ? schools.filter((s) => s.type === scope) : schools), [schools, scope]);

  const rows: Row[] = useMemo(() => {
    const type = scope || undefined;
    if (tab === "city") {
      const stateOfCity = new Map<string, string>();
      pool.forEach((s) => { if (!stateOfCity.has(s.city)) stateOfCity.set(s.city, stateFor(s)); });
      return countBy(pool, (s) => s.city).map((o) => ({
        key: o.value, label: o.value, sub: stateOfCity.get(o.value) || undefined, count: o.count,
        href: listingHref({ type, city: o.value }),
      }));
    }
    if (tab === "state") {
      return countBy(pool, (s) => stateFor(s)).map((o) => ({
        key: o.value, label: o.value, count: o.count, href: listingHref({ type, state: o.value }),
      }));
    }
    if (tab === "area") {
      const m = new Map<string, { area: string; city: string; count: number }>();
      pool.forEach((s) => {
        if (!s.area || !s.city) return;
        const k = `${s.area}|${s.city}`;
        const cur = m.get(k);
        if (cur) cur.count += 1;
        else m.set(k, { area: s.area, city: s.city, count: 1 });
      });
      return [...m.values()]
        .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area))
        .map((o) => ({ key: `${o.area}|${o.city}`, label: o.area, sub: o.city, count: o.count, href: listingHref({ type, city: o.city, area: o.area }) }));
    }
    if (tab === "board") {
      return BOARDS.map((b) => ({
        key: b, label: BOARD_LABEL[b] ?? b, sub: BOARD_NOTE[b], count: pool.filter((s) => s.board === b).length,
        href: listingHref({ type, board: b }),
      })).sort((a, b) => b.count - a.count);
    }
    if (tab === "gender") {
      return GENDERS.map((g) => ({
        key: g, label: GENDER_LABEL[g] ?? g, count: pool.filter((s) => s.gender === g).length,
        href: listingHref({ type, gender: g }),
      })).sort((a, b) => b.count - a.count);
    }
    // fees: same rule as the listing (fee >= min && fee <= max)
    return FEE_BANDS.slice(1).map((b) => {
      const min = b.min ? Number(b.min) : 0;
      const max = b.max ? Number(b.max) : Infinity;
      return {
        key: b.id, label: b.label, count: pool.filter((s) => s.fee >= min && s.fee <= max).length,
        href: listingHref({ type, min: b.min, max: b.max }),
      };
    });
  }, [pool, scope, tab]);

  const visibleRows = rows.filter((r) => r.count > 0);
  const shown = all ? visibleRows : visibleRows.slice(0, LIMIT);

  const pickTab = (t: Tab) => { setTab(t); setAll(false); };
  const pickScope = (v: string) => { setScope(v); setAll(false); };

  return (
    <section id="browse" className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
          <div>
            <h2 className="vv-display text-3xl font-extrabold leading-tight text-[#0B2A47] sm:text-4xl">Start from what you already know</h2>
            <p className="mt-3 text-[#4A5C70]">Pick a city, a board, a fee range or a gender. The numbers are schools listed right now.</p>
            <div role="tablist" aria-label="Browse schools by" className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={tab === t.id}
                  onClick={() => pickTab(t.id)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
                    tab === t.id ? "bg-[#0B2A47] text-white" : "bg-[#EEF4FA] text-[#0B2A47] hover:bg-[#DCE9F5] lg:bg-transparent"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="School type">
              {SCOPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={scope === s.value}
                  onClick={() => pickScope(s.value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    scope === s.value ? "border-[#0795DC] bg-[#E6F4FC] text-[#0A5C91]" : "border-[#D6DDE5] text-[#41566B] hover:border-[#0795DC]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <p className="mt-8 rounded-2xl bg-[#F3F8FC] p-6 text-[#41566B]">
                Nothing listed here yet. Try another type, or{" "}
                <Link href="/schools" className="font-bold text-[#0A5C91] underline underline-offset-2">see every school</Link>.
              </p>
            ) : (
              <ul className="mt-5 grid gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((r) => (
                  <li key={r.key}>
                    <Link href={r.href} className="group flex items-baseline gap-2 border-b border-[#E3EAF2] px-1 py-3.5 transition hover:bg-[#F3F8FC]">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-[#0B2A47]">{r.label}</span>
                        {r.sub && <span className="block truncate text-xs text-[#6A7C8F]">{r.sub}</span>}
                      </span>
                      <span aria-hidden className="mx-1 min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[#BFCFDF]" />
                      <span className="text-sm font-bold tabular-nums text-[#0A5C91]">{r.count}</span>
                      <ArrowRight aria-hidden className="-ml-1 h-4 w-4 -translate-x-1 self-center text-[#EC0E58] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              {visibleRows.length > LIMIT && (
                <button type="button" onClick={() => setAll(!all)} className="rounded-xl border border-[#D6DDE5] px-5 py-2.5 text-sm font-bold text-[#0A5C91] hover:border-[#0795DC]">
                  {all ? "Show fewer" : `Show all ${visibleRows.length}`}
                </button>
              )}
              <Link href="/schools" className="text-sm font-bold text-[#0A5C91] underline underline-offset-4 hover:text-[#EC0E58]">See every school</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
