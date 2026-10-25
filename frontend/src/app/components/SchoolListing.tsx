"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useListingParams, type ListingInitial } from "../lib/useListingParams";
import { useEffect, useMemo, useRef, useState } from "react";
import { BOARDS, BOARD_LABEL, GENDERS, TYPES, citiesOf, formatFee, stateFor, statesOf, type School } from "../data/schools";
import {
  clearPreference,
  isBoardingType,
  normalizeType,
  readPreference,
  savePreference,
  toHeroType,
  type Preference,
} from "../lib/preferences";
import { schoolPath } from "../lib/seo";
import { typePath } from "../lib/links";
import { classList } from "../data/profile";
import LocationReviews from "./LocationReviews";
import { APPLIED_EVENT } from "./PlaceHeading";
import { announceLocation } from "../lib/useActiveLocation";
import { typeRank } from "../lib/preferences";
import Icon from "./Icon";


const PAGE_SIZE = 5;

type Filters = {
  q: string;
  state: string[];
  city: string[];
  type: string[];
  board: string[];
  gender: string[];
  cls: string[];
  min: string;
  max: string;
};

const EMPTY: Filters = { q: "", state: [], city: [], type: [], board: [], gender: [], cls: [], min: "", max: "" };
const URL_FILTER_KEYS = ["q", "city", "state", "type", "board"];

// Saved cookie preference -> listing filters
function filtersFromPref(pref: Preference): Filters {
  const type = normalizeType(pref.type);
  const loc = pref.location ? [pref.location] : [];
  return {
    ...EMPTY,
    type: type ? [type] : [],
    state: isBoardingType(pref.type) ? loc : [],
    city: isBoardingType(pref.type) ? [] : loc,
  };
}
const FEE_PRESETS = [
  { label: "Below ₹50,000", max: "50000" },
  { label: "Below ₹1 lakh", max: "100000" },
  { label: "Below ₹2 lakh", max: "200000" },
];

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-[#E1E7EE] py-5 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-xs font-extrabold uppercase tracking-wider text-[#0B2A47]"
      >
        {title}
        <span className={`text-[#0A7BBF] transition ${open ? "" : "-rotate-90"}`}>⌄</span>
      </button>
      {open && <div className="mt-3 space-y-1">{children}</div>}
    </div>
  );
}

/** one-choice option (radio style). Click the selected one again to clear it. */
function Radio({ label, checked, onPick, count }: { label: string; checked: boolean; onPick: () => void; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-sm text-[#4E5A68] transition hover:bg-[#F1F8FC]">
      <input type="radio" checked={checked} onClick={onPick} onChange={() => {}} className="h-4 w-4 accent-[#0795DC]" />
      <span className="flex-1">{label}</span>
      {typeof count === "number" && <span className="text-xs text-[#8896A6]">{count}</span>}
    </label>
  );
}

type Opt = { value: string; label?: string; count?: number };

/** list with an optional search box and a "Show more" button (for long lists: states, cities, classes) */
function FilterList({ options, value, onPick, searchable = false, limit = 6, noun }: {
  options: Opt[]; value?: string; onPick: (v: string) => void; searchable?: boolean; limit?: number; noun: string;
}) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const term = q.trim().toLowerCase();
  const matches = options.filter((o) => (o.label ?? o.value).toLowerCase().includes(term));
  let shown = term || all ? matches : matches.slice(0, limit);
  // the selected one is always visible, even when it is beyond the first few
  const sel = options.find((o) => o.value === value);
  if (sel && !shown.includes(sel)) shown = [sel, ...shown];
  return (
    <>
      {searchable && options.length > limit && (
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${noun}…`}
          className="mb-2 h-10 w-full rounded-lg border border-[#D6DDE5] bg-white px-3 text-sm outline-none focus:border-[#0795DC]"
        />
      )}
      {shown.map((o) => (
        <Radio key={o.value} label={o.label ?? o.value} count={o.count} checked={value === o.value} onPick={() => onPick(o.value)} />
      ))}
      {matches.length === 0 && <p className="px-1 py-2 text-sm text-[#8896A6]">No {noun} found</p>}
      {!term && matches.length > limit && (
        <button type="button" onClick={() => setAll(!all)} className="px-1 pt-1 text-sm font-bold text-[#0A7BBF] hover:underline">
          {all ? "Show less" : `Show more (${matches.length - limit})`}
        </button>
      )}
    </>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-sm text-[#4E5A68] transition hover:bg-[#F1F8FC]">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded accent-[#0795DC]" />
      {label}
    </label>
  );
}

export default function SchoolListing({ schools, initial, showReviews = true }: { schools: School[]; initial?: ListingInitial; showReviews?: boolean }) {
  const CITIES = useMemo(() => citiesOf(schools), [schools]);
  const STATES = useMemo(() => statesOf(schools), [schools]);
  const router = useRouter();
  const params = useListingParams(initial);

  const fromUrl = useMemo<Filters>(
    () => ({
      ...EMPTY,
      q: params.get("q") ?? "",
      state: params.get("state") ? [params.get("state")!] : [],
      city: params.get("city") ? [params.get("city")!] : [],
      type: normalizeType(params.get("type") ?? "") ? [normalizeType(params.get("type")!)] : [],
      board: params.get("board") ? [params.get("board")!] : [],
    }),
    [params]
  );
  const hasUrlFilter = URL_FILTER_KEYS.some((k) => params.get(k));
  // opened on a clean URL like /day-schools/pune: keep that URL as it is
  const fixedRoute = !!initial && Object.values(initial).some(Boolean);

  // choosing a city also selects its state; choosing a state drops a city of another state
  const normalize = (f: Filters): Filters => {
    const city = f.city[0];
    if (city) {
      const st = stateFor(schools.find((x) => x.city === city) ?? { city });
      return { ...f, state: st ? [st] : f.state };
    }
    return f;
  };
  const fromUrlN = useMemo(() => normalize(fromUrl), [fromUrl, schools]); // eslint-disable-line react-hooks/exhaustive-deps

  const [draft, setDraft] = useState<Filters>(fromUrlN);
  const [applied, setApplied] = useState<Filters>(fromUrlN);
  const appliedRef = useRef(applied);
  appliedRef.current = applied;
  const [sort, setSort] = useState(params.get("sort") === "rating" ? "rating" : "recommended");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [compare, setCompare] = useState<number[]>([]);

  // Filters come from (1) the URL, or (2) when the URL has none, from the saved cookie
  // (what the user selected on Home last time). This is what pre-selects Mumbai + Day School.
   // URL se aaye filters ek baar apply hote hain, phir URL saaf kar dete hain
  const cleaned = useRef(false);

  useEffect(() => {
    // URL abhi saaf kiya gaya hai -> jo filters lage hain wahi rakho
    if (!hasUrlFilter && cleaned.current) {
      cleaned.current = false;
      return;
    }

    let next = fromUrlN;
    if (!hasUrlFilter) {
      const pref = readPreference();
      if (pref) next = normalize(filtersFromPref(pref));
    }
    setDraft(next);
    setApplied(next);
    setPage(1);

    if (hasUrlFilter) {
      // refresh par bhi yaad rahe, isliye cookie mein save
      if (next.type.length === 1) syncCookie(next);
      else clearPreference();

      // ?type= ?city= ... hata do aur saaf URL dikhao (jaise /day-schools/pune)
      if (!fixedRoute) {
        cleaned.current = true;
        const sp = new URLSearchParams(window.location.search);
        URL_FILTER_KEYS.forEach((k) => sp.delete(k));
        const qs = sp.toString();
        const clean = cleanPathFor(next);
        window.history.replaceState(null, "", clean !== "/schools" ? clean : qs ? `/schools?${qs}` : "/schools");
        window.setTimeout(() => { cleaned.current = false; }, 400);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUrlN, hasUrlFilter]);

  // type + one place and nothing else  ->  /day-schools/pune ; otherwise plain /schools
  function cleanPathFor(f: Filters) {
    const place = f.city[0] || f.state[0];
    const only = f.type.length === 1 && place && !f.board.length && !f.gender.length && !f.cls.length && !f.min && !f.max && !f.q;
    return only ? typePath(f.type[0], place) : "/schools";
  }
  function syncUrl(f: Filters) {
    const path = cleanPathFor(f);
    if (window.location.pathname === path) return;
    cleaned.current = true;
    window.history.replaceState(null, "", path);
    window.setTimeout(() => { cleaned.current = false; }, 400);
  }

  // Remember the choice made in the filters so the next visit starts from the same place.
  function syncCookie(f: Filters) {
    if (f.type.length !== 1) return;
    const heroType = toHeroType(f.type[0]);
    const location = isBoardingType(heroType) ? f.state[0] ?? "" : f.city[0] ?? "";
    savePreference({ type: heroType, location });
  }

  // every filter group allows ONE choice. State and City depend on each other.
  const pick = (key: "state" | "city" | "type" | "board" | "gender" | "cls", value: string) =>
    setDraft((d) => {
      const on = d[key][0] === value;
      let next: Filters = { ...d, [key]: on ? [] : [value] };
      if (key === "state") next = { ...next, city: [] }; // another state -> its cities only
      if (key === "city" && !on) next = normalize(next); // city -> its state gets ticked automatically
      return next;
    });

  // tell Hero / FAQ / Footer which state or city is being shown (they change title, text, photos, links)
  useEffect(() => {
    const city = applied.city[0];
    const state = applied.state[0];
    announceLocation(city ? { kind: "city", name: city } : state ? { kind: "state", name: state } : null);
  }, [applied.city, applied.state]);

  const place = applied.city[0] || applied.state[0] || "";
  const typeName = applied.type[0] ?? "";
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(APPLIED_EVENT, { detail: { type: typeName, place, board: applied.board[0] ?? "" } }));
  }, [typeName, place, applied.board]);
  const heading = !typeName && !place && !applied.board[0]
    ? "Schools for You"
    : `${applied.board[0] ? `${BOARD_LABEL[applied.board[0]] ?? applied.board[0]} ` : ""}${typeName ? `${typeName}s` : "Schools"}${place ? ` in ${place}` : ""}`;

  // links like "Day Schools in Nashik" (Related links) change the filters here instead of opening a new page
  useEffect(() => {
    const on = (e: Event) => {
      const d = ((e as CustomEvent).detail ?? {}) as Partial<Record<"type" | "state" | "city" | "board", string>>;
      const cur = appliedRef.current;
      let next: Filters = { ...cur };
      (Object.keys(d) as ("type" | "state" | "city" | "board")[]).forEach((k) => { if (d[k]) next = { ...next, [k]: [d[k] as string] }; });
      if (d.city) next = { ...next, state: [] };
      if (d.state && !d.city) next = { ...next, city: [] };
      next = normalize(next);
      setDraft(next);
      setApplied(next);
      setPage(1);
      syncCookie(next);
      syncUrl(next);
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("vv-apply-filters", on);
    return () => window.removeEventListener("vv-apply-filters", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools]);

  // schools whose class range includes the chosen class
  const offersClass = (sc: School, cls: string) => classList(sc).some((c) => c.cls === cls);

  const results = useMemo(() => {
    const q = applied.q.toLowerCase();
    const min = applied.min ? Number(applied.min) : 0;
    const max = applied.max ? Number(applied.max) : Infinity;
    const list = schools.filter(
      (s) =>
        (!q || `${s.name} ${s.area} ${s.city} ${s.board}`.toLowerCase().includes(q)) &&
        (!applied.state.length || applied.state.includes(stateFor(s))) &&
        (!applied.city.length || applied.city.includes(s.city)) &&
        (!applied.type.length || applied.type.includes(s.type)) &&
        (!applied.board.length || applied.board.includes(s.board)) &&
        (!applied.gender.length || applied.gender.includes(s.gender)) &&
        (!applied.cls.length || offersClass(s, applied.cls[0])) &&
        s.fee >= min &&
        s.fee <= max
    );
    // "Recommended": Boarding schools first, then Play School, then Day (stable, API order kept inside each group)
    if (sort === "recommended") list.sort((a, b) => typeRank(a.type) - typeRank(b.type));
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    if (sort === "fee-low") list.sort((a, b) => a.fee - b.fee);
    if (sort === "fee-high") list.sort((a, b) => b.fee - a.fee);
    return list;
  }, [applied, sort]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function apply() {
    setApplied(draft);
    syncCookie(draft);
    syncUrl(draft);
    setPage(1);
    setShowFilters(false);
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  }
  function clearAll() {
    clearPreference();
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
    syncUrl(EMPTY);
    if (params.toString() && !fixedRoute) router.push("/schools", { scroll: false });
  }
  function goTo(p: number) {
    setPage(p);
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  }
  function toggleCompare(id: number) {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));
  }

  const stateOpts: Opt[] = useMemo(() => {
    const m = new Map<string, number>();
    schools.forEach((x) => { const st = stateFor(x); if (st) m.set(st, (m.get(st) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, count]) => ({ value, count }));
  }, [schools]);
  const cityOpts: Opt[] = useMemo(() => {
    const m = new Map<string, number>();
    schools.filter((x) => !draft.state[0] || stateFor(x) === draft.state[0]).forEach((x) => m.set(x.city, (m.get(x.city) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, count]) => ({ value, count }));
  }, [schools, draft.state]);
  const classOpts: Opt[] = useMemo(() => {
    const seen = new Set<string>();
    schools.forEach((x) => classList(x).forEach((c) => seen.add(c.cls)));
    const order = ["Nursery", "KG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
    return order.filter((c) => seen.has(c)).map((value) => ({ value }));
  }, [schools]);

  const numInput =
    "h-11 w-full rounded-xl border border-[#D6DDE5] bg-white px-3 text-sm text-[#0B2A47] outline-none placeholder:text-[#8896A6] focus:border-[#0795DC] focus:ring-4 focus:ring-[#0795DC]/15";

  return (
    <section id="results" className="scroll-mt-24 bg-white py-10 sm:py-12">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[290px_1fr] lg:px-8">
        {/* ---------- Filters ---------- */}
        <aside>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-[#D6DDE5] bg-white px-4 py-3 text-sm font-extrabold text-[#0A5C91] lg:hidden"
          >
            <span className="flex items-center gap-2"><Icon name="filters" className="h-4 w-4" /> Filters</span> <Icon name={showFilters ? "x" : "menu"} className="h-4 w-4" />
          </button>

          <div className={`${showFilters ? "block" : "hidden"} lg:sticky lg:top-24 lg:block`}>
            <div className="flex max-h-[calc(100vh-7.5rem)] flex-col rounded-2xl border border-[#E1E7EE] bg-white shadow-lg shadow-[#0B2A47]/5">
              <div className="flex items-center justify-between border-b border-[#E1E7EE] px-5 py-4">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#0B2A47]"><Icon name="filters" className="h-5 w-5" /> Filters</h2>
                <button type="button" onClick={clearAll} className="text-sm font-semibold text-[#EC0E58] underline underline-offset-4 hover:text-[#C8104F]">
                  Clear all
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <FilterGroup title="State">
                  <FilterList noun="states" searchable options={stateOpts} value={draft.state[0]} onPick={(v) => pick("state", v)} />
                </FilterGroup>
                <FilterGroup title={draft.state[0] ? `City in ${draft.state[0]}` : "City"}>
                  <FilterList noun="cities" searchable options={cityOpts} value={draft.city[0]} onPick={(v) => pick("city", v)} />
                </FilterGroup>
                <FilterGroup title="School type">
                  {TYPES.map((c) => <Radio key={c} label={c} checked={draft.type[0] === c} onPick={() => pick("type", c)} />)}
                </FilterGroup>
                <FilterGroup title="Class">
                  <FilterList noun="classes" options={classOpts} value={draft.cls[0]} onPick={(v) => pick("cls", v)} limit={6} />
                </FilterGroup>
                <FilterGroup title="Annual fees">
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    <input inputMode="numeric" placeholder="Min ₹" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value.replace(/\D/g, "") })} className={numInput} />
                    <input inputMode="numeric" placeholder="Max ₹" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value.replace(/\D/g, "") })} className={numInput} />
                  </div>
                  {FEE_PRESETS.map((p) => (
                    <Check
                      key={p.label}
                      label={p.label}
                      checked={draft.max === p.max && !draft.min}
                      onChange={() => setDraft({ ...draft, min: "", max: draft.max === p.max ? "" : p.max })}
                    />
                  ))}
                </FilterGroup>
                <FilterGroup title="School board">
                  {BOARDS.map((c) => <Radio key={c} label={BOARD_LABEL[c]} checked={draft.board[0] === c} onPick={() => pick("board", c)} />)}
                </FilterGroup>
                <FilterGroup title="Gender">
                  {GENDERS.map((c) => <Radio key={c} label={c} checked={draft.gender[0] === c} onPick={() => pick("gender", c)} />)}
                </FilterGroup>
              </div>

              <div className="border-t border-[#E1E7EE] p-4">
                <button
                  type="button"
                  onClick={apply}
                  className="w-full rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#0A5C91]/25 transition hover:-translate-y-0.5"
                >
                  Apply filters
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ---------- Results ---------- */}
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#0B2A47]">{heading}</h2>
              <p className="mt-1 text-sm text-[#707E8F]">
                Showing {results.length} of {schools.length} schools
              </p>
            </div>
            <label className="flex items-center gap-3 text-sm text-[#5C6A7B]">
              Sort by
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="h-11 rounded-xl border border-[#D6DDE5] bg-white px-4 font-semibold text-[#0B2A47] outline-none focus:border-[#0795DC] focus:ring-4 focus:ring-[#0795DC]/15"
              >
                <option value="recommended">Recommended</option>
                <option value="rating">Highest rated</option>
                <option value="fee-low">Fees: low to high</option>
                <option value="fee-high">Fees: high to low</option>
              </select>
            </label>
          </div>

          <div className="mt-6 space-y-5">
            {visible.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#C9D3DE] bg-[#F6FAFD] p-10 text-center">
                <p className="text-lg font-extrabold text-[#0B2A47]">No schools match these filters</p>
                <p className="mt-2 text-sm text-[#707E8F]">Try removing a filter or widening your fee range.</p>
                <button onClick={clearAll} className="mt-5 rounded-xl bg-[#0A5C91] px-6 py-3 text-sm font-bold text-white hover:bg-[#0795DC]">
                  Clear all filters
                </button>
              </div>
            )}

            {visible.map((s) => (
              <article key={s.id} className="rounded-3xl border border-[#E1E7EE] bg-white p-5 shadow-sm transition hover:border-[#9ED8F5] hover:shadow-xl hover:shadow-[#0795DC]/10">
                <div className="grid gap-5 md:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_230px]">
                  {/* Photo */}
                  <div className="relative h-52 overflow-hidden rounded-2xl bg-[#E6F4FC] md:h-auto md:min-h-[210px]">
                    <img src={s.image} alt={`${s.name} campus`} loading="lazy" className="h-full w-full object-cover" />
                    {s.topRated && (
                      <span className="absolute left-3 top-3 rounded-lg bg-[#0795DC] px-3 py-1.5 text-xs font-extrabold text-white shadow">
                        <span className="inline-flex items-center gap-1"><Icon name="star" filled className="h-3.5 w-3.5" /> Top rated</span>
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 rounded-lg bg-[#0B2A47]/85 px-2.5 py-1.5 text-xs font-bold text-white">
                      ▣ {s.photos} photos
                    </span>
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <h3 className="text-2xl font-extrabold leading-tight text-[#0B2A47]">
                      <Link href={schoolPath(s)} className="transition hover:text-[#0A7BBF]">{s.name}</Link>
                    </h3>
                    <p className="mt-2 text-sm text-[#707E8F]">
                      <Icon name="mapPin" className="mr-1 inline h-4 w-4 text-[#EC0E58]" /> {s.area}, {s.city === "Delhi" ? "New Delhi" : s.city}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <span className="rounded-lg bg-[#E1F1FA] px-3 py-1.5 text-xs font-extrabold text-[#0A5C91]">{s.board}</span>
                      <span className="text-[#5C6A7B]">{s.grades}</span>
                    </div>
                    <p className="mt-3 text-sm text-[#5C6A7B]">{s.type} · {s.gender}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(Array.isArray(s.facilities) ? s.facilities : []).map((f) => (
                        <span key={f} className="rounded-full border border-[#D6DDE5] bg-[#F6FAFD] px-3 py-1.5 text-xs text-[#4E5A68]">
                          <Icon name="check" className="mr-1 inline h-3.5 w-3.5 text-[#0795DC]" /> {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price + actions */}
                  <div className="flex flex-col border-t border-[#E1E7EE] pt-5 md:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0 xl:text-right">
                    <div className="flex items-center justify-between xl:flex-col xl:items-end xl:gap-1">
                      {s.reviews > 0 ? (
                        <>
                          <span className="rounded-lg bg-[#FDE8EF] px-3 py-1.5 text-sm font-extrabold text-[#C8104F]"><Icon name="star" filled className="mr-1 inline h-4 w-4 align-[-2px]" />{s.rating} / 5</span>
                          <Link href={`${schoolPath(s)}/reviews`} className="text-xs text-[#5C6A7B] underline underline-offset-2 hover:text-[#0A7BBF]">{s.reviews} parent reviews</Link>
                        </>
                      ) : (
                        <Link href={`${schoolPath(s)}/reviews`} className="text-xs text-[#5C6A7B] underline underline-offset-2 hover:text-[#0A7BBF]">No reviews yet</Link>
                      )}
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-[#707E8F]">Annual tuition from</p>
                      <p className="text-3xl font-extrabold text-[#0B2A47]">{formatFee(s.fee)}</p>
                      <p className="text-xs text-[#8896A6]">per year · indicative</p>
                    </div>
                    <a
                      href={`tel:${s.phone}`}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#0795DC] px-4 py-3 text-sm font-extrabold text-[#0A7BBF] transition hover:bg-[#0795DC] hover:text-white"
                    >
                      <Icon name="phone" className="h-4 w-4" /> Call Now
                    </a>
                  </div>
                </div>

                {/* Footer row */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#E1E7EE] pt-4">
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-[#4E5A68]">
                    <input type="checkbox" checked={compare.includes(s.id)} onChange={() => toggleCompare(s.id)} className="h-4 w-4 accent-[#EC0E58]" />
                    Add to compare
                  </label>
                  <span className="hidden text-xs text-[#707E8F] sm:flex sm:items-center sm:gap-1"><Icon name="school" className="h-4 w-4" /> Campus visits available</span>
                  <div className="flex gap-3">
                    <Link href={schoolPath(s)} className="rounded-xl border border-[#D6DDE5] px-5 py-3 text-sm font-bold text-[#0B2A47] transition hover:border-[#0795DC] hover:text-[#0A7BBF]">
                      View School
                    </Link>
                    <Link
                      href={`/counselling?school=${encodeURIComponent(s.name)}`}
                      className="rounded-xl bg-[#EC0E58] px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-[#EC0E58]/25 transition hover:-translate-y-0.5 hover:bg-[#C8104F]"
                    >
                      Enquire ↗
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
              <button disabled={current === 1} onClick={() => goTo(current - 1)} className="h-11 w-11 rounded-xl border border-[#D6DDE5] font-bold text-[#0B2A47] disabled:opacity-40">‹</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => goTo(p)}
                  aria-current={p === current}
                  className={`h-11 w-11 rounded-xl border font-extrabold transition ${
                    p === current ? "border-transparent bg-gradient-to-br from-[#0A5C91] to-[#0795DC] text-white shadow-md" : "border-[#D6DDE5] text-[#0B2A47] hover:border-[#0795DC]"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button disabled={current === pages} onClick={() => goTo(current + 1)} className="h-11 w-11 rounded-xl border border-[#D6DDE5] font-bold text-[#0B2A47] disabled:opacity-40">›</button>
            </nav>
          )}
        </div>
      </div>

      {showReviews && place && (
        <LocationReviews
          place={place}
          schools={schools.filter((x) => (applied.city[0] ? x.city === applied.city[0] : stateFor(x) === applied.state[0]))}
        />
      )}

      {/* Floating compare bar */}
      {compare.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-4 rounded-2xl bg-[#0B2A47] px-5 py-4 text-white shadow-2xl">
          <p className="text-sm font-semibold">{compare.length} of 3 schools selected</p>
          <div className="flex gap-2">
            <button onClick={() => setCompare([])} className="rounded-lg px-3 py-2 text-sm text-white/80 hover:text-white">Clear</button>
            <button onClick={() => router.push(`/compare?ids=${compare.join(",")}`)} className="rounded-xl bg-[#EC0E58] px-5 py-2.5 text-sm font-extrabold hover:bg-[#C8104F]">
              Compare →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
