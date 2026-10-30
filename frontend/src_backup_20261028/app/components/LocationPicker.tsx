"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CITY_LIST, OPEN_PICKER_EVENT, STATE_LIST } from "../lib/places";
import { typePath } from "../lib/links";
import { useLocationIndex } from "../lib/useActiveLocation";
import { readPreference, savePreference } from "../lib/preferences";
import Icon from "./Icon";

const TYPES = [
  { label: "Boarding Schools", type: "Boarding School", by: "state" as const },
  { label: "Day Schools", type: "Day School", by: "city" as const },
  { label: "Play Schools", type: "Play School", by: "city" as const },
];
const ACCENT = [
  "border-[#0A7BBF] bg-[#DDEAF2] text-[#0A5C91]",
  "border-[#EC0E58] bg-[#FAE5EC] text-[#B30E49]",
  "border-[#6E8BAD] bg-[#E5EAF0] text-[#39506B]",
];

const indexFor = (label?: string) => {
  const v = (label ?? "").toLowerCase();
  if (v.includes("boarding") && !v.includes("day")) return 0;
  if (v.includes("play")) return 2;
  if (v.includes("day")) return 1;
  return 0;
};

export default function LocationPicker() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [ti, setTi] = useState(0);
  const [search, setSearch] = useState("");
  const [place, setPlace] = useState("");
  const [showAll, setShowAll] = useState(false);
  const index = useLocationIndex(); // states + cities that really have schools

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const wanted = (e as CustomEvent<{ type?: string }>).detail?.type;
      const saved = readPreference();
      const idx = wanted ? indexFor(wanted) : saved ? indexFor(String(saved.type)) : 0;
      setTi(idx);
      setPlace(!wanted && saved && indexFor(String(saved.type)) === idx ? saved.location : "");
      setSearch("");
      setOpen(true);
    };
    window.addEventListener(OPEN_PICKER_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PICKER_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const t = TYPES[ti];
  const noun = t.by === "state" ? "state" : "city";
  // only places that have schools of this type (most schools first). Static lists are used only if the API is down.
  const all = useMemo(() => {
    if (!index.length) return (t.by === "state" ? STATE_LIST : CITY_LIST).map((name) => ({ name, state: "", count: 0 }));
    const rows = t.by === "state"
      ? index.map((s) => ({ name: s.state, state: "", count: s.types[t.type] ?? 0 }))
      : index.flatMap((s) => s.cities.map((c) => ({ name: c.name, state: s.state, count: c.types[t.type] ?? 0 })));
    return rows.filter((r) => r.count > 0 && r.name && r.name !== "Other").sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [index, t.by, t.type]);
  const term = search.trim().toLowerCase();
  const matches = all.filter((p) => p.name.toLowerCase().includes(term));
  const LIMIT = 12;
  const places = term || showAll ? matches : matches.slice(0, LIMIT);

  function changeType(i: number) {
    if (i === ti) return;
    setTi(i);
    setPlace("");
    setSearch("");
    setShowAll(false);
  }

  function confirm() {
    if (!place) return;
    if (ti < 2) savePreference({ type: t.label as never, location: place });
    setOpen(false);
    router.push(typePath(t.type, place));
  }

  if (!mounted || !open) return null;

  // document.body me render hota hai, isliye kisi section ke neeche ya upar nahi dabta
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#12304A]/65 p-3 backdrop-blur-sm sm:p-6"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white bg-gradient-to-br from-[#FAFCFD] via-[#F4F8FA] to-[#FCEDF2] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#DDE3E9] bg-white/70 p-5 sm:p-6">
          <div>
            <span className="inline-block rounded-full bg-[#DDEAF2] px-3 py-1 text-xs font-bold text-[#0A5C91]">
              VIDYAVISTA LOCATION FINDER
            </span>
            <h2 id="location-title" className="mt-3 text-xl font-extrabold text-[#12304A] sm:text-2xl">
              Where are you looking for schools?
            </h2>
            <p className="mt-2 text-sm text-[#687789]">Choose a type and select your preferred location.</p>
          </div>
          <button
            type="button"
            aria-label="Close location selector"
            onClick={() => setOpen(false)}
            className="rounded-xl bg-[#E7ECF1] px-3 py-1 text-2xl text-[#466281] transition hover:bg-[#D3DCE7]"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4 border-b border-[#DDE3E9] p-5 sm:p-6 lg:grid-cols-[1fr_290px]">
          <div className="flex flex-wrap items-center gap-2">
            {TYPES.map((x, i) => (
              <button
                key={x.label}
                type="button"
                onClick={() => changeType(i)}
                className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                  ti === i ? ACCENT[i] : "border-[#DEE3E8] bg-white text-[#4E5A68] hover:border-[#A8B8CB]"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-[#C9D3DF] bg-white px-4 focus-within:border-[#0A7BBF] focus-within:ring-2 focus-within:ring-[#DDEAF2]">
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#0A7BBF]" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${noun}...`}
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#12304A] outline-none placeholder:text-[#939FAD]"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#687789]">
              {t.by === "state" ? "Select a state" : "Popular cities"}
            </h3>
            <span className="rounded-full bg-[#FAE5EC] px-3 py-1 text-xs font-bold text-[#B30E49]">{matches.length} locations</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {places.map((row) => row.name).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlace(p)}
                className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  place === p
                    ? "border-[#0A7BBF] bg-[#DDEAF2] text-[#0A5C91] shadow-sm"
                    : "border-[#DCE2E9] bg-white text-[#404A56] hover:border-[#6ABEEE]"
                }`}
              >
                <span>{p}</span>
                {place === p && <Icon name="check" className="h-4 w-4 text-[#0A7BBF]" />}
              </button>
            ))}
          </div>

          {!term && matches.length > LIMIT && (
            <button type="button" onClick={() => setShowAll(!showAll)} className="mt-4 text-sm font-extrabold text-[#0A7BBF] hover:underline">
              {showAll ? "Show less" : `Show more locations (${matches.length - LIMIT})`}
            </button>
          )}

          {places.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#C9D3DF] bg-white/70 px-4 py-10 text-center">
              <p className="font-bold text-[#12304A]">No matching locations</p>
              <p className="mt-2 text-sm text-[#687789]">Try searching with a different name.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#DDE3E9] bg-white/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-[#5C6A7B]">
            {place ? `Selected ${noun}: ${place}` : `Choose a ${noun} to continue.`}
          </p>
          <button
            type="button"
            disabled={!place}
            onClick={confirm}
            className="rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-6 py-3 font-extrabold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}