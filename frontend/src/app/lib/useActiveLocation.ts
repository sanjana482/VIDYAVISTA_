"use client";
// Which state / city is the visitor looking at right now?
//   1. /schools?city=Mumbai or ?state=Maharashtra   (URL wins on the listing page)
//   2. the saved cookie (what they picked on Home last time)
// The listing page can also announce its applied filters (announceLocation).
import { useEffect, useState } from "react";
import { PREF_EVENT, isBoardingType, readPreference } from "./preferences";
import { fetchLocationContent, fetchLocationIndex, type ActiveLocation, type IndexState, type LocationContent } from "./locationsApi";
import { slugify } from "./seo";

const SET_EVENT = "vv-location";

export const announceLocation = (loc: ActiveLocation) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SET_EVENT, { detail: loc }));
};

function fromBrowser(): ActiveLocation {
  if (window.location.pathname === "/schools") {
    const sp = new URLSearchParams(window.location.search);
    const city = sp.get("city");
    const state = sp.get("state");
    if (city) return { kind: "city", name: city };
    if (state) return { kind: "state", name: state };
  }
  const pref = readPreference();
  if (pref?.location) return { kind: isBoardingType(pref.type) ? "state" : "city", name: pref.location };
  return null;
}

const same = (a: ActiveLocation, b: ActiveLocation) => a?.kind === b?.kind && a?.name === b?.name;

export function useActiveLocation(): ActiveLocation {
  const [loc, setLoc] = useState<ActiveLocation>(null);
  useEffect(() => {
    const sync = () => setLoc((prev) => { const next = fromBrowser(); return same(prev, next) ? prev : next; });
    const onSet = (e: Event) => { const next = (e as CustomEvent<ActiveLocation>).detail ?? null; setLoc((prev) => (same(prev, next) ? prev : next)); };
    sync();
    window.addEventListener(PREF_EVENT, sync);
    window.addEventListener("popstate", sync);
    window.addEventListener(SET_EVENT, onSet);
    return () => {
      window.removeEventListener(PREF_EVENT, sync);
      window.removeEventListener("popstate", sync);
      window.removeEventListener(SET_EVENT, onSet);
    };
  }, []);
  return loc;
}

// ---- content written by the admin for that place (cached for the session) ----
const contentCache = new Map<string, LocationContent | null>();
const inflight = new Map<string, Promise<void>>();

export function useLocationContent(loc: ActiveLocation): LocationContent | null {
  const key = loc ? `${loc.kind}:${slugify(loc.name)}` : "";
  const [, bump] = useState(0);
  useEffect(() => {
    if (!loc || contentCache.has(key)) return;
    let alive = true;
    let p = inflight.get(key);
    if (!p) {
      p = fetchLocationContent(loc.kind, loc.name).then((c) => { contentCache.set(key, c); inflight.delete(key); });
      inflight.set(key, p);
    }
    p.then(() => alive && bump((n) => n + 1));
    return () => { alive = false; };
  }, [key, loc]);
  return key ? contentCache.get(key) ?? null : null;
}

// ---- state > city > type index for the footer ----
let indexPromise: Promise<IndexState[]> | null = null;
export function useLocationIndex(): IndexState[] {
  const [data, setData] = useState<IndexState[]>([]);
  useEffect(() => {
    let alive = true;
    indexPromise ??= fetchLocationIndex();
    indexPromise.then((d) => alive && setData(d));
    return () => { alive = false; };
  }, []);
  return data;
}
