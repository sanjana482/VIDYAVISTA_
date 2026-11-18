"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, RotateCcw, Search } from "lucide-react";
import { BOARDS, BOARD_LABEL, GENDERS, TYPES, formatFee, stateFor, type School } from "../../data/schools";
import {
  CLASS_OPTIONS,
  FEE_BANDS,
  GENDER_DISPLAY,
  GENDER_LABEL,
  TYPE_DISPLAY,
  countBy,
  filterSchools,
  needsPlace,
} from "../../lib/finder";
import { finderTarget } from "../../lib/browse";
import { schoolPath } from "../../lib/seo";
import { useFinder } from "./FinderProvider";

type Opt = { value: string; label: string; display?: string };

/** A highlighted word inside the sentence. It is a real <select> underneath, so keyboards and phones just work. */
function Blank({ label, value, onChange, options, anyLabel, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  anyLabel: string;
  placeholder: string;
}) {
  const current = options.find((o) => o.value === value);
  const shown = current ? current.display ?? current.label : placeholder;
  return (
    <span className="vv-blank-wrap">
      <span className="vv-blank" data-set={value ? "true" : "false"}>
        {shown}
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 opacity-70" />
      </span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </span>
  );
}

export default function FinderHero() {
  const router = useRouter();
  const { schools, f, set, reset } = useFinder();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const dayLike = needsPlace(f.type); // day / play school: a city (or state) must be chosen first

  // ---------- options (counts follow the chosen type / state / city) ----------
  const typePool = useMemo(() => (f.type ? schools.filter((s) => s.type === f.type) : schools), [schools, f.type]);
  const statePool = typePool;
  const cityPool = useMemo(() => (f.state ? typePool.filter((s) => stateFor(s) === f.state) : typePool), [typePool, f.state]);

  const typeOpts: Opt[] = TYPES.map((t) => ({
    value: t,
    label: `${t} (${schools.filter((s) => s.type === t).length})`,
    display: TYPE_DISPLAY[t],
  })).filter((o) => schools.length === 0 || !o.label.endsWith("(0)"));
  const popularCities = useMemo(() => countBy(typePool, (s) => s.city).slice(0, 6), [typePool]);
  const genderOpts: Opt[] = GENDERS.map((g) => ({
    value: g,
    label: `${GENDER_LABEL[g]} (${typePool.filter((s) => s.gender === g).length})`,
    display: GENDER_DISPLAY[g],
  })).filter((o) => schools.length === 0 || !o.label.endsWith("(0)"));
  const stateOpts: Opt[] = useMemo(
    () => countBy(statePool, (s) => stateFor(s)).map((o) => ({ value: o.value, label: `${o.value} (${o.count})`, display: o.value })),
    [statePool]
  );
  const cityOpts: Opt[] = useMemo(
    () => countBy(cityPool, (s) => s.city).map((o) => ({ value: o.value, label: `${o.value} (${o.count})`, display: o.value })),
    [cityPool]
  );
  const areaOpts: Opt[] = useMemo(
    () =>
      f.city
        ? countBy(cityPool.filter((s) => s.city === f.city), (s) => s.area).map((o) => ({ value: o.value, label: `${o.value} (${o.count})`, display: o.value }))
        : [],
    [cityPool, f.city]
  );
  const boardOpts: Opt[] = BOARDS.map((b) => ({
    value: b,
    label: `${BOARD_LABEL[b]} (${typePool.filter((s) => s.board === b).length})`,
    display: `${BOARD_LABEL[b]} board`,
  })).filter((o) => schools.length === 0 || !o.label.endsWith("(0)"));
  const classOpts: Opt[] = CLASS_OPTIONS.map((c) => ({ value: c, label: c }));
  const feeOpts: Opt[] = FEE_BANDS.slice(1).map((b) => ({ value: b.id, label: b.label, display: b.label.toLowerCase() }));

  // ---------- live results ----------
  const ready = !!f.type && (!dayLike || !!f.city || !!f.state);
  const matched = useMemo(() => (ready ? filterSchools(schools, f) : []), [schools, f, ready]);
  const top = useMemo(
    () =>
      matched
        .slice()
        .sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured) || b.rating - a.rating || b.reviews - a.reviews)
        .slice(0, 3),
    [matched]
  );
  const anySet = Object.values(f).some(Boolean);
  const typeName = f.type ? (TYPE_DISPLAY[f.type] ?? "school") : "school";

  const suggestions = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return schools.filter((s) => s.name.toLowerCase().includes(t)).slice(0, 5);
  }, [schools, q]);

  const cities = useMemo(() => new Set(schools.map((s) => s.city)).size, [schools]);
  const states = useMemo(() => new Set(schools.map((s) => stateFor(s)).filter(Boolean)).size, [schools]);
  const reviews = useMemo(() => schools.reduce((n, s) => n + (s.reviews || 0), 0), [schools]);

  return (
    <section id="finder" className="relative bg-[#EEF4FA]">
      <div className="mx-auto max-w-[1240px] px-4 pb-14 pt-10 sm:px-6 sm:pt-14 lg:pb-20">
        <div className="max-w-2xl">
          <h1 className="vv-display text-[2.4rem] font-extrabold leading-[1.04] text-[#0B2A47] sm:text-5xl lg:text-[3.4rem]">
            Which school fits your child?
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#41566B] sm:text-lg">
            Fill in the blanks. The schools beside it update as you go, so you can see what is out there before you open a single page.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ---------- the notebook page ---------- */}
          <div className="overflow-hidden rounded-3xl border border-[#D3E2F0] bg-white shadow-[0_30px_60px_-40px_rgba(11,42,71,0.55)]">
            <div className="vv-ruled">
              <p className="vv-ruled-hint">Tap a highlighted word to change it.</p>
              <p className="vv-sentence vv-display">
                I’m looking for a{" "}
                <Blank label="School type" value={f.type} onChange={(v) => set("type", v)} options={typeOpts} anyLabel="Choose day or boarding" placeholder="day or boarding school" />{" "}
                for{" "}
                <Blank label="Boys, girls or co-ed" value={f.gender} onChange={(v) => set("gender", v)} options={genderOpts} anyLabel="Boys or girls" placeholder="boys or girls" />{" "}
                in{" "}
                <Blank label="State or region" value={f.state} onChange={(v) => set("state", v)} options={stateOpts} anyLabel={dayLike ? "Choose a state" : "Any state"} placeholder={dayLike ? "pick a state" : "any state"} />
                ,{" "}
                <Blank label="City" value={f.city} onChange={(v) => set("city", v)} options={cityOpts} anyLabel={dayLike ? "Choose a city" : "Any city"} placeholder={dayLike ? "pick a city" : "any city"} />
                {f.city && (
                  <>
                    ,{" "}
                    <Blank label="Area or locality" value={f.area} onChange={(v) => set("area", v)} options={areaOpts} anyLabel="Any area" placeholder="any area" />
                  </>
                )}
                . I’d like{" "}
                <Blank label="School board" value={f.board} onChange={(v) => set("board", v)} options={boardOpts} anyLabel="Any board" placeholder="any board" />{" "}
                for{" "}
                <Blank label="Class" value={f.cls} onChange={(v) => set("cls", v)} options={classOpts} anyLabel="Any class" placeholder="any class" />
                , with annual fees{" "}
                <Blank label="Annual fees" value={f.fee} onChange={(v) => set("fee", v)} options={feeOpts} anyLabel="Of any size" placeholder="of any size" />
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-[#E3ECF5] bg-[#F8FBFE] px-5 py-4 sm:px-8">
              <button
                type="button"
                disabled={!ready || matched.length === 0}
                onClick={() => router.push(finderTarget(f))}
                className="vv-btn inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#EC0E58] px-6 text-sm font-extrabold text-white shadow-md shadow-[#EC0E58]/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {!f.type
                  ? "Choose day or boarding first"
                  : !ready
                  ? "Choose a city to continue"
                  : matched.length === 0
                  ? "No schools match"
                  : `Show ${matched.length} ${matched.length === 1 ? "school" : "schools"}`}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              {anySet && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex h-12 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#0A5C91] hover:bg-[#E6F2FB]"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Start over
                </button>
              )}
              <p className="ml-auto hidden text-xs text-[#5F7389] sm:block">Fees are annual tuition and indicative.</p>
            </div>
          </div>

          {/* ---------- live matches + name search ---------- */}
          <aside className="flex flex-col rounded-3xl border border-[#D3E2F0] bg-white p-5 shadow-[0_30px_60px_-40px_rgba(11,42,71,0.55)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const t = q.trim();
                router.push(t ? `/schools?q=${encodeURIComponent(t)}` : "/schools");
              }}
            >
              <label htmlFor="finder-name" className="text-sm font-semibold text-[#0B2A47]">Know the school’s name?</label>
              <div className="relative mt-2">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0A5C91]" />
                <input
                  id="finder-name"
                  type="search"
                  autoComplete="off"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => setFocus(true)}
                  onBlur={() => window.setTimeout(() => setFocus(false), 150)}
                  placeholder="Type a school name"
                  className="h-11 w-full rounded-xl border border-[#D6DDE5] bg-white pl-9 pr-3 text-sm text-[#0B2A47] outline-none placeholder:text-[#8896A6] focus:border-[#0795DC] focus:ring-4 focus:ring-[#0795DC]/15"
                />
                {focus && suggestions.length > 0 && (
                  <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[#D6DDE5] bg-white shadow-xl">
                    {suggestions.map((s) => (
                      <li key={s.id}>
                        <Link href={schoolPath(s)} className="block px-3 py-2.5 hover:bg-[#EEF6FC]">
                          <span className="block truncate text-sm font-semibold text-[#0B2A47]">{s.name}</span>
                          <span className="block truncate text-xs text-[#5F7389]">{s.area}, {s.city}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </form>

            <div className="mt-6 flex items-baseline justify-between gap-3">
              <h2 className="vv-display text-lg font-bold text-[#0B2A47]">Matching now</h2>
              <span aria-live="polite" className="text-sm font-semibold text-[#0A5C91]">
                {ready && schools.length > 0 ? `${matched.length} ${matched.length === 1 ? "school" : "schools"}` : ""}
              </span>
            </div>

            {schools.length === 0 ? (
              <p className="mt-3 rounded-xl bg-[#F3F8FC] p-4 text-sm leading-6 text-[#41566B]">
                Schools could not be loaded just now. Please try again in a moment.
              </p>
            ) : !f.type ? (
              <div className="mt-3 rounded-xl bg-[#F3F8FC] p-4 text-sm leading-6 text-[#41566B]">
                Start with the kind of school.
                <div className="mt-3 flex flex-wrap gap-2">
                  {typeOpts.map((o) => (
                    <button key={o.value} type="button" onClick={() => set("type", o.value)} className="rounded-full border border-[#0795DC] bg-white px-4 py-1.5 text-sm font-bold text-[#0A5C91] hover:bg-[#E6F4FC]">
                      {o.value}
                    </button>
                  ))}
                </div>
              </div>
            ) : !ready ? (
              <div className="mt-3 rounded-xl bg-[#F3F8FC] p-4 text-sm leading-6 text-[#41566B]">
                Which city? {typeName.charAt(0).toUpperCase() + typeName.slice(1)}s are listed city by city.
                <div className="mt-3 flex flex-wrap gap-2">
                  {popularCities.map((c) => (
                    <button key={c.value} type="button" onClick={() => set("city", c.value)} className="rounded-full border border-[#D6DDE5] bg-white px-3 py-1.5 text-sm font-semibold text-[#0A5C91] hover:border-[#0795DC]">
                      {c.value} <span className="text-xs text-[#8896A6]">{c.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : top.length === 0 ? (
              <div className="mt-3 rounded-xl bg-[#FFF4F7] p-4 text-sm leading-6 text-[#7A2B45]">
                No school fits every blank. Loosen the board, class or fees first.
                <button type="button" onClick={reset} className="mt-2 block font-bold underline underline-offset-2">Start over</button>
              </div>
            ) : (
              <>
                <ul className="mt-3 divide-y divide-[#E8EEF5]">
                  {top.map((s) => (
                    <li key={s.id}>
                      <Link href={schoolPath(s)} className="flex gap-3 rounded-xl p-2 transition hover:bg-[#F1F7FC]">
                        <img src={s.image} alt="" loading="lazy" className="h-16 w-20 shrink-0 rounded-lg bg-[#E6F4FC] object-cover" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-[#0B2A47]">{s.name}</span>
                          <span className="block truncate text-xs text-[#5F7389]">{s.area}, {s.city}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#41566B]">
                            <span className="rounded bg-[#E1F1FA] px-1.5 py-0.5 font-bold text-[#0A5C91]">{BOARD_LABEL[s.board] ?? s.board}</span>
                            <span>{s.fee > 0 ? `${formatFee(s.fee)} a year` : "Fees updating"}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <a href="#browse" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#0A5C91] hover:text-[#EC0E58]">
                  Browse by gender, fees and board below <span aria-hidden>↓</span>
                </a>
              </>
            )}
          </aside>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-sm text-[#41566B]">
        {schools.length > 0 ? (
          <p>
            Listing {schools.length.toLocaleString("en-IN")} schools in {cities} {cities === 1 ? "city" : "cities"} across {states} {states === 1 ? "state" : "states"}
            {reviews > 0 ? `, with ${reviews.toLocaleString("en-IN")} parent reviews.` : "."}
          </p>
        ) : <span />}
          <p>
            Stuck between two schools?{" "}
            <a href="#talk-to-us" className="font-bold text-[#0A5C91] underline underline-offset-4 hover:text-[#EC0E58]">Book a free call</a>
          </p>
        </div>
      </div>
    </section>
  );
}
