"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ListingDescription from "./ListingDescription";
import { BOARDS, BOARD_LABEL, TYPES, citiesOf, stateFor, statesOf, type School } from "../data/schools";
import { isBoardingType, normalizeType, readPreference, savePreference, toHeroType } from "../lib/preferences";
import { resolveContent, type LocationContent } from "../lib/locationsApi";
import HeroVisual from "./HeroVisual";
import { APPLIED_EVENT, headingFor, type AppliedInfo } from "./PlaceHeading";
import { useActiveLocation, useLocationContent } from "../lib/useActiveLocation";
import { useListingParams, type ListingInitial } from "../lib/useListingParams";
import { listingHref } from "../lib/links";

export default function SchoolsHero({
  schools,
  initial,
  heading,
  initialContent,
}: {
  schools: School[];
  initial?: ListingInitial;
  heading?: string;
  initialContent?: LocationContent | null;
}) {
  const CITIES = citiesOf(schools);
  const STATES = statesOf(schools);
  const router = useRouter();
  const params = useListingParams(initial);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [board, setBoard] = useState("");
  // "city:Mumbai" or "state:Maharashtra" (empty = all locations)
  const [loc, setLoc] = useState("");

  // Pre-select the search bar from the URL, or from the saved cookie when the URL has no filters.
  const urlKey = params.toString();
  useEffect(() => {
    const urlType = normalizeType(params.get("type") ?? "");
    const urlCity = params.get("city");
    const urlState = params.get("state");
    const hasUrl = ["q", "type", "board", "city", "state"].some((k) => params.get(k));
    if (hasUrl) {
      setQ(params.get("q") ?? "");
      setType(urlType);
      setBoard(params.get("board") ?? "");
      setLoc(urlCity ? `city:${urlCity}` : urlState ? `state:${urlState}` : "");
      return;
    }
    const pref = readPreference();
    if (pref) {
      setType(normalizeType(pref.type));
      setLoc(pref.location ? `${isBoardingType(pref.type) ? "state" : "city"}:${pref.location}` : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey]);

  // ---- what the visitor selected (state / city) decides the title, text and photos ----
    const initialLoc = initial?.city
    ? { kind: "city" as const, name: initial.city }
    : initial?.state
    ? { kind: "state" as const, name: initial.state }
    : undefined;
  const active = useActiveLocation(initialLoc);
  // what the listing below currently shows (type, place, board): keeps the title in step with the filters
  const [applied, setApplied] = useState<AppliedInfo | null>(null);
  useEffect(() => {
    const on = (e: Event) => setApplied((e as CustomEvent<AppliedInfo>).detail);
    window.addEventListener(APPLIED_EVENT, on);
    return () => window.removeEventListener(APPLIED_EVENT, on);
  }, []);
  // the admin text of the page we landed on is shown only while that same place is selected
  const sameAsInitial = initialContent !== undefined && (!active || active.name === initialLoc?.name);
  const fetched = useLocationContent(sameAsInitial ? null : active);
  const content = sameAsInitial ? initialContent : fetched;
  const placeSchools = active
    ? schools.filter((s) => (active.kind === "state" ? stateFor(s) === active.name : s.city === active.name))
    : schools;
  const view = resolveContent(active, content, placeSchools.length);
  const adminPhotos = [content?.cover, ...(content?.photos ?? [])].filter((x): x is string => !!x);
  const titleText = heading
    ? applied && applied.place
      ? `Best ${headingFor(applied)} 2027-28`
      : heading
    : view.title;
  const Title = heading ? "h2" : "h1"; // on /day-schools/pune the real <h1> is rendered by the server page
  const titleParts = titleText.match(/^(.*?)\s*(20\d\d-\d\d)$/);
  const originalTitle = useRef("");
  useEffect(() => {
    
    if (!originalTitle.current) originalTitle.current = document.title;
        if (initial) return;
    document.title = active ? view.metaTitle : originalTitle.current;
  }, [active, view.metaTitle]);

  const summary = (() => {
    const rated = placeSchools.filter((x) => x.reviews > 0 && x.rating > 0);
    const total = rated.reduce((n, x) => n + x.reviews, 0);
    return { total, avg: total ? rated.reduce((n, x) => n + x.rating * x.reviews, 0) / total : 0 };
  })();
  const boardCount = new Set(placeSchools.map((s) => s.board)).size;
  const stats: [number, string][] = [
    [placeSchools.length, active ? `${placeSchools.length === 1 ? "school" : "schools"} in ${active.name}` : "schools listed"],
    active?.kind === "city"
      ? [new Set(placeSchools.map((s) => s.area)).size, "localities"]
      : [new Set(placeSchools.map((s) => s.city)).size, "cities"],
    [boardCount, "boards"],
  ];

    function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const [kind, value] = loc.split(":");
    const placeKey = kind === "state" ? "state" : "city";
    if (type) savePreference({ type: toHeroType(type), location: value ?? "" });
    let href = listingHref({ type, board, ...(value ? { [placeKey]: value } : {}) });
    if (q.trim()) {
      const qs = new URLSearchParams({ q: q.trim() });
      if (type) qs.set("type", type);
      if (board) qs.set("board", board);
      if (value) qs.set(placeKey, value);
      href = `/schools?${qs}`;
    }
    router.push(href, { scroll: false });
    setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 80);
  }

  const field =
    "h-12 w-full rounded-xl border border-[#D6DDE5] bg-white px-4 text-sm text-[#0B2A47] outline-none transition placeholder:text-[#8896A6] focus:border-[#0795DC] focus:ring-4 focus:ring-[#0795DC]/15";
  const label = "mb-2 block text-[11px] font-extrabold uppercase tracking-wider text-[#5C6A7B]";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#E6F4FC] via-white to-[#FDE8EF]">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#0795DC]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#EC0E58]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-[#5C6A7B]">
          <Link href="/" className="hover:text-[#0A7BBF]">Home</Link>
          <span className="mx-2">›</span>
          {active ? (
            <>
              <Link href="/schools" className="hover:text-[#0A7BBF]">Schools</Link>
              <span className="mx-2">›</span>
              <span className="text-[#0B2A47]">{active.name}</span>
            </>
          ) : (
            <span className="text-[#0B2A47]">Schools</span>
          )}
        </nav>

        <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <span className="inline-flex rounded-full border border-[#D6DDE5] bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0A5C91] shadow-sm">
              Find the right fit for your child
            </span>

            <Title className="mt-5 text-4xl font-extrabold tracking-tight text-[#0B2A47] sm:text-5xl">
              {titleParts ? (
                <>
                  {titleParts[1]}{" "}
                  <span className="bg-gradient-to-r from-[#0795DC] to-[#EC0E58] bg-clip-text text-transparent">{titleParts[2]}</span>
                </>
              ) : (
                titleText
              )}
            </Title>

            <div className="mt-5">
              <ListingDescription key={view.description} description={view.description} maxLength={180} />
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#4E5A68]">
              {stats.map(([n, t]) => (
                <span key={t} className="rounded-full border border-[#D6DDE5] bg-white px-4 py-2 shadow-sm">
                  <strong className="font-extrabold text-[#0A5C91]">{n}</strong> {t}
                </span>
              ))}
              <span className="rounded-full border border-[#D6DDE5] bg-white px-4 py-2 font-semibold shadow-sm">
                Fees · Reviews · Admission
              </span>
            </div>
          </div>

          <HeroVisual
            place={active?.name ?? ""}
            count={placeSchools.length}
            boards={Array.from(new Set(placeSchools.map((x) => BOARD_LABEL[x.board] ?? x.board)))}
            rating={Math.round(summary.avg * 10) / 10}
            reviews={summary.total}
            minFee={Math.min(...placeSchools.map((x) => x.fee).filter((f) => f > 0), Infinity) === Infinity ? 0 : Math.min(...placeSchools.map((x) => x.fee).filter((f) => f > 0))}
            photos={adminPhotos.slice(0, 3)}
          />
        </div>

        {/* Search bar */}
        <form
          onSubmit={onSearch}
          className="mt-10 grid gap-4 rounded-3xl border border-[#E1E7EE] bg-white p-5 shadow-xl shadow-[#0B2A47]/5 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto] lg:items-end"
        >
          <div>
            <label htmlFor="hq" className={label}>Search schools</label>
            <input id="hq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="School name, location or keyword" className={field} />
          </div>
          <div>
            <label htmlFor="ht" className={label}>School type</label>
            <select id="ht" value={type} onChange={(e) => setType(e.target.value)} className={field}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="hb" className={label}>Board</label>
            <select id="hb" value={board} onChange={(e) => setBoard(e.target.value)} className={field}>
              <option value="">All boards</option>
              {BOARDS.map((b) => <option key={b} value={b}>{BOARD_LABEL[b]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="hl" className={label}>Location</label>
            <select id="hl" value={loc} onChange={(e) => setLoc(e.target.value)} className={field}>
              <option value="">All locations</option>
              <optgroup label="Cities">
                {CITIES.map((c) => <option key={c} value={`city:${c}`}>{c}</option>)}
              </optgroup>
              <optgroup label="States">
                {STATES.map((c) => <option key={c} value={`state:${c}`}>{c}</option>)}
              </optgroup>
            </select>
          </div>
          <button
            type="submit"
            className="h-12 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-7 text-sm font-extrabold text-white shadow-lg shadow-[#0A5C91]/25 transition hover:-translate-y-0.5 md:col-span-2 lg:col-span-1"
          >
            ⌕ Search
          </button>
        </form>
      </div>
    </section>
  );
}
