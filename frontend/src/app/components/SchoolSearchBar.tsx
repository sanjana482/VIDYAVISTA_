"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { openLocationPicker } from "../lib/places";
import { isBoardingType } from "../lib/preferences";

export type SearchSchool = { id: number; name: string; city: string; state?: string };

// Hero search. Two different buttons, two different jobs:
//  1. the round ICON      -> only opens (or closes) the bar. It never searches.
//  2. the "Search" button -> inside the open bar, this one searches:
//       - location already saved (cookie) -> listing page opens (/schools?type=..&state|city=..&q=..)
//       - first visit, no location yet    -> the location panel opens first, the listing opens after "Confirm Location"
export default function SchoolSearchBar({
  schools = [],
  schoolType,
  location,
  className = "",
}: {
  schools?: SearchSchool[];
  schoolType: string;
  location: string;
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hint, setHint] = useState(0);

  const hints = useMemo(() => schools.slice(0, 5).map((s) => s.name), [schools]);
  const hits = useMemo(() => {
    const t = name.trim().toLowerCase();
    if (!open || t.length < 2) return [];
    return schools.filter((s) => s.name.toLowerCase().includes(t)).slice(0, 5);
  }, [name, schools, open]);

  // focus the field once the bar has opened
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 380);
    return () => window.clearTimeout(id);
  }, [open]);

  // the hint inside the empty bar changes by itself
  useEffect(() => {
    if (!open || name || hints.length < 2) return;
    const id = window.setInterval(() => setHint((h) => (h + 1) % hints.length), 2600);
    return () => window.clearInterval(id);
  }, [open, name, hints.length]);

  function toggle() {
    if (!open) setOpen(true);
    else if (!name.trim()) setOpen(false);
    else inputRef.current?.focus();
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!open) return; // pressing Enter on the closed icon must not search
    const q = name.trim();
    if (!location) {
      openLocationPicker(schoolType, q); // first visit: ask for the location, then open the listing
      return;
    }
    const params = new URLSearchParams();
    params.set("type", schoolType);
    params.set(isBoardingType(schoolType) ? "state" : "city", location);
    if (q) params.set("q", q);
    router.push(`/schools?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} role="search" className={`relative h-14 w-full ${className}`}>
      <div
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node) && !name.trim()) setOpen(false); }}
        onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); (e.target as HTMLElement).blur?.(); } }}
        className={`absolute left-0 top-0 h-14 rounded-full border bg-white transition-[width,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.65,0,0.25,1)] ${
          open
            ? "w-full border-[#0A7BBF] shadow-xl shadow-[#0A7BBF]/20 ring-4 ring-[#0A7BBF]/15"
            : "w-14 border-[#0A5C91] shadow-lg shadow-[#0A5C91]/25"
        }`}
      >
        {/* 1. the round icon: only opens / closes the bar */}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Close school search" : "Open school search"}
          aria-expanded={open}
          className={`absolute left-0 top-0 z-10 flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-500 ${
            open ? "bg-transparent text-[#0A7BBF]" : "bg-[#0A5C91] text-white hover:bg-[#0A7BBF]"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>

        {/* the field */}
        <div className={`absolute inset-y-0 left-12 right-32 transition-opacity duration-300 ${open ? "opacity-100 delay-300" : "pointer-events-none opacity-0"}`}>
          {!name && hints.length > 0 && (
            <span key={hint} className="vv-hint pointer-events-none absolute inset-0 flex items-center truncate text-sm text-[#8A96A5]">
              Search school name, e.g. “{hints[hint]}”
            </span>
          )}
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            tabIndex={open ? 0 : -1}
            aria-label="School name"
            placeholder={hints.length ? "" : "Search school name"}
            autoComplete="off"
            className="h-full w-full bg-transparent text-sm font-semibold text-[#0B2A47] outline-none placeholder:font-normal placeholder:text-[#8A96A5]"
          />
        </div>

        {/* 2. the Search button: only exists inside the open bar */}
        <button
          type="submit"
          tabIndex={open ? 0 : -1}
          className={`vv-btn absolute right-1.5 top-1.5 flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#EC0E58] to-[#C8104F] px-5 text-sm font-extrabold text-white transition-opacity duration-300 ${
            open ? "opacity-100 delay-300" : "pointer-events-none opacity-0"
          }`}
        >
          Search
        </button>

        {/* name suggestions */}
        {hits.length > 0 && (
          <ul className="vv-pop absolute left-2 right-2 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-[#D9E0E8] bg-white py-1.5 shadow-xl">
            {hits.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setName(s.name); inputRef.current?.focus(); }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#F1F5F8]"
                >
                  <span className="truncate font-semibold text-[#0B2A47]">{s.name}</span>
                  <span className="shrink-0 text-xs text-[#8A96A5]">{s.city}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* caption next to the closed icon */}
      <span
        className={`pointer-events-none absolute left-[4.25rem] top-1/2 -translate-y-1/2 whitespace-nowrap text-sm font-semibold text-[#0A5C91] transition-all duration-300 ${
          open ? "-translate-x-2 opacity-0" : "opacity-100"
        }`}
      >
        Search by school name
      </span>
    </form>
  );
}
