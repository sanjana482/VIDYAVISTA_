"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { stateFor, type School } from "../../data/schools";
import { EMPTY_FINDER, type FinderState } from "../../lib/finder";
import { isBoardingType, normalizeType, readPreference, PREF_EVENT } from "../../lib/preferences";

type Ctx = {
  schools: School[];
  f: FinderState;
  set: (k: keyof FinderState, v: string) => void;
  reset: () => void;
};

const FinderCtx = createContext<Ctx | null>(null);

export function useFinder(): Ctx {
  const c = useContext(FinderCtx);
  if (!c) throw new Error("useFinder must be used inside <FinderProvider>");
  return c;
}

/**
 * Holds what the visitor picked in the sentence / hero / cookie, so category sections
 * (by gender, fees, board ...) always follow the active selection.
 */
export function FinderProvider({ schools, children }: { schools: School[]; children: ReactNode }) {
  const [f, setF] = useState<FinderState>(EMPTY_FINDER);

  /** drop a state / city that has no school of the chosen type, so you never land on an empty list */
  const sanitize = useCallback(
    (n: FinderState): FinderState => {
      let x = n;
      const inType = (s: School) => !x.type || s.type === x.type;
      if (x.state && !schools.some((s) => inType(s) && stateFor(s) === x.state)) x = { ...x, state: "", city: "", area: "" };
      if (x.city && !schools.some((s) => inType(s) && s.city === x.city)) x = { ...x, city: "", area: "" };
      return x;
    },
    [schools]
  );

  const set = useCallback(
    (k: keyof FinderState, v: string) =>
      setF((prev) => {
        let next = { ...prev, [k]: v } as FinderState;
        if (k === "state") next = { ...next, city: "", area: "" };
        if (k === "city") {
          next = { ...next, area: "" };
          if (v) {
            const hit = schools.find((s) => s.city === v);
            const st = hit ? stateFor(hit) : "";
            if (st) next = { ...next, state: st };
          }
        }
        return sanitize(next);
      }),
    [schools, sanitize]
  );

  const reset = useCallback(() => setF(EMPTY_FINDER), []);

  // Sync with cookie preference and listen to live changes (vv-pref)
  useEffect(() => {
    const syncFromCookie = () => {
      const p = readPreference();
      const t = p ? normalizeType(p.type) : "Day School";
      setF((prev) =>
        sanitize({
          ...prev,
          type: t,
          ...(p?.location ? (isBoardingType(p.type) ? { state: p.location } : { city: p.location }) : {}),
        })
      );
    };
    syncFromCookie();
    window.addEventListener(PREF_EVENT, syncFromCookie);
    return () => window.removeEventListener(PREF_EVENT, syncFromCookie);
  }, [schools.length, sanitize]);

  const value = useMemo(() => ({ schools, f, set, reset }), [schools, f, set, reset]);
  return <FinderCtx.Provider value={value}>{children}</FinderCtx.Provider>;
}
