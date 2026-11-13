"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ListingDescription from "./ListingDescription";
import { BOARDS, BOARD_LABEL, TYPES, citiesOf, stateFor, statesOf, type School } from "../data/schools";
import { isBoardingType, normalizeType, readPreference, savePreference, toHeroType } from "../lib/preferences";
import { resolveContent, type LocationContent } from "../lib/locationsApi";
import HeroVisual from "./HeroVisual";
import SchoolSearchBar from "./SchoolSearchBar";

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

  // What type and board are currently selected or active:
  const activeType =
    applied?.type ||
    (params.get("type") ? normalizeType(params.get("type")!) : "") ||
    normalizeType(initial?.type ?? "") ||
    (heading?.includes("Boarding") ? "Boarding School" : heading?.includes("Day") ? "Day School" : heading?.includes("Play") ? "Play School" : "") ||
    (readPreference()?.type ? toHeroType(readPreference()!.type) : "");

  const activeBoard = applied?.board || params.get("board") || "";

  // the admin text of the page we landed on is shown only while that same place is selected
  const sameAsInitial = initialContent !== undefined && (!active || active.name === initialLoc?.name);
  const fetched = useLocationContent(sameAsInitial ? null : active);
  const content = sameAsInitial ? initialContent : fetched;

  // Active location: URL/cookie OR what the visitor clicked in the sidebar filter (applied.place)
  const activePlace = applied?.place
    ? (STATES.includes(applied.place) ? { kind: "state" as const, name: applied.place } : { kind: "city" as const, name: applied.place })
    : active;

  // Filter placeSchools by BOTH location AND active school type/board
  const placeSchools = schools.filter((s) => {
    const locMatch = !activePlace ? true : (activePlace.kind === "state" ? stateFor(s) === activePlace.name : s.city === activePlace.name);
    const typeMatch = !activeType || s.type === activeType;
    const boardMatch = !activeBoard || s.board === activeBoard;
    return locMatch && typeMatch && boardMatch;
  });

  const typeNoun = activeType
    ? activeType === "Boarding School"
      ? "boarding schools"
      : activeType === "Day School"
      ? "day schools"
      : "play schools"
    : "schools";

  const rawBoards = Array.from(new Set(placeSchools.map((x) => BOARD_LABEL[x.board] ?? x.board)));
  const cleanBoards = Array.from(new Set(rawBoards.map((b) => (b === "No Board" || b === "IB" ? "IB Board" : b)).filter(Boolean)));

  const view = resolveContent(activePlace || active, content, placeSchools.length);
  const adminPhotos = [content?.cover, ...(content?.photos ?? [])].filter((x): x is string => !!x);

  // a school type and/or board was picked: title + text speak about exactly that
  const picked = !heading && applied && (applied.type || applied.board) ? applied : null;
  const pickedTitle = picked ? `Best ${headingFor(picked)} 2027-28` : "";

  const heroDescription = (() => {
    if (activeType || picked) {
      const bName = activeBoard ? (BOARD_LABEL[activeBoard] ?? activeBoard) + " " : "";
      const where = activePlace ? `in ${activePlace.name}` : "across India";
      const lead = placeSchools.length > 0 ? `Explore ${placeSchools.length} ${bName}${typeNoun} ${where}` : `Explore ${bName}${typeNoun} ${where}`;
      const what =
        activeType === "Boarding School"
          ? "residential facilities, annual fees and parent reviews"
          : activeType === "Play School"
          ? "age groups, annual fees and parent reviews"
          : "classes offered, annual fees and parent reviews";
      return `${lead}. Compare ${what}, then enquire directly for 2027-28 admission on VidyaVista.`;
    }
    return view.description;
  })();

  const titleText = picked
    ? pickedTitle
    : heading
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
    document.title = picked ? `${pickedTitle} | VidyaVista` : active ? view.metaTitle : originalTitle.current;
  }, [active, view.metaTitle, picked, pickedTitle]);

  const summary = (() => {
    const rated = placeSchools.filter((x) => x.reviews > 0 && x.rating > 0);
    const total = rated.reduce((n, x) => n + x.reviews, 0);
    return { total, avg: total ? rated.reduce((n, x) => n + x.rating * x.reviews, 0) / total : 0 };
  })();

  const stats: [number, string][] = [
    [placeSchools.length, activePlace ? `${placeSchools.length === 1 ? typeNoun.slice(0, -1) : typeNoun} in ${activePlace.name}` : `${typeNoun} listed`],
    activePlace?.kind === "city"
      ? [new Set(placeSchools.map((s) => s.area)).size, "localities"]
      : [new Set(placeSchools.map((s) => s.city)).size, "cities"],
    [cleanBoards.length, "boards"],
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
    <section className="relative z-40 bg-gradient-to-br from-[#E6F4FC] via-white to-[#FDE8EF]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#0795DC]/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#EC0E58]/10 blur-3xl" />
      </div>

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
              <ListingDescription key={heroDescription} description={heroDescription} maxLength={180} />
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
            place={activePlace?.name ?? ""}
            typeLabel={typeNoun}
            count={placeSchools.length}
            boards={cleanBoards}
            rating={Math.round(summary.avg * 10) / 10}
            reviews={summary.total}
            minFee={Math.min(...placeSchools.map((x) => x.fee).filter((f) => f > 0), Infinity) === Infinity ? 0 : Math.min(...placeSchools.map((x) => x.fee).filter((f) => f > 0))}
            photos={adminPhotos.slice(0, 3)}
          />
        </div>

        {/* Search bar matching home page */}
        <div className="mt-8 mx-auto max-w-2xl relative z-50">
          <div className="rounded-3xl border border-[#D0DBE5] bg-white/95 p-3 shadow-lg shadow-[#0B2A47]/5 backdrop-blur-sm sm:p-4 relative z-50">
            <SchoolSearchBar
              schools={schools}
              schoolType={activeType || type || "Day School"}
              location={activePlace?.name || (loc ? loc.split(":")[1] : "") || ""}
              initialQuery={q}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
