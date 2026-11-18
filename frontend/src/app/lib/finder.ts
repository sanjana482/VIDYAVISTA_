// Shared logic for the home page finder + "browse by" index.
// Uses the SAME filter rules as the /schools listing, so the count you see on the
// home page is the count you get after you click.
import { stateFor, type School } from "../data/schools";
import { classList } from "../data/profile";
import { listingHref } from "./links";

export type FinderState = {
  type: string; // "Day School" | "Boarding School" | "Play School" | ""
  gender: string; // "Co-ed" | "Girls" | "Boys" | ""
  state: string;
  city: string;
  area: string;
  board: string;
  cls: string; // "Nursery" | "KG" | "Class 1" ... "Class 12"
  fee: string; // id of a FEE_BANDS entry, "" = any
};

export const EMPTY_FINDER: FinderState = { type: "", gender: "", state: "", city: "", area: "", board: "", cls: "", fee: "" };

export type FeeBand = { id: string; slug: string; label: string; min: string; max: string };

/** Annual tuition bands. Add / change bands here and both the finder and the browse index update. */
export const FEE_BANDS: FeeBand[] = [
  { id: "", slug: "", label: "Any budget", min: "", max: "" },
  { id: "u50", slug: "under-50000", label: "Under ₹50,000", min: "", max: "50000" },
  { id: "50-100", slug: "50000-to-100000", label: "₹50,000 to ₹1 lakh", min: "50000", max: "100000" },
  { id: "100-200", slug: "100000-to-200000", label: "₹1 to ₹2 lakh", min: "100000", max: "200000" },
  { id: "200-400", slug: "200000-to-400000", label: "₹2 to ₹4 lakh", min: "200000", max: "400000" },
  { id: "400+", slug: "above-400000", label: "Above ₹4 lakh", min: "400000", max: "" },
];
export const feeBand = (id: string): FeeBand => FEE_BANDS.find((b) => b.id === id) ?? FEE_BANDS[0];

export const CLASS_OPTIONS: string[] = ["Nursery", "KG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];

/** how each value reads inside the sentence on the home page */
export const TYPE_DISPLAY: Record<string, string> = {
  "Day School": "day school",
  "Boarding School": "boarding school",
  "Play School": "play school",
};
export const GENDER_DISPLAY: Record<string, string> = { "Co-ed": "boys and girls", Girls: "girls only", Boys: "boys only" };
export const GENDER_LABEL: Record<string, string> = { "Co-ed": "Co-ed (boys and girls)", Girls: "Girls only", Boys: "Boys only" };

export function countBy<T>(list: T[], key: (t: T) => string | undefined | null): { value: string; count: number }[] {
  const m = new Map<string, number>();
  list.forEach((x) => {
    const k = key(x);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  });
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }));
}

/** the same rules SchoolListing uses */
export function filterSchools(list: School[], f: FinderState): School[] {
  const band = feeBand(f.fee);
  const min = band.min ? Number(band.min) : 0;
  const max = band.max ? Number(band.max) : Infinity;
  const area = f.area.toLowerCase();
  return list.filter(
    (s) =>
      (!f.type || s.type === f.type) &&
      (!f.gender || s.gender === f.gender) &&
      (!f.state || stateFor(s) === f.state) &&
      (!f.city || s.city === f.city) &&
      (!area || (s.area || "").toLowerCase() === area) &&
      (!f.board || s.board === f.board) &&
      (!f.cls || classList(s).some((c) => c.cls === f.cls)) &&
      (!f.fee || s.fee > 0) &&
      s.fee >= min &&
      s.fee <= max
  );
}

/** /schools?type=...&gender=...  (SchoolListing reads these and cleans the URL) */
export function finderHref(f: FinderState): string {
  const b = feeBand(f.fee);
  return listingHref({
    type: f.type,
    board: f.board,
    city: f.city,
    state: f.state,
    area: f.area,
    gender: f.gender,
    cls: f.cls,
    min: b.min,
    max: b.max,
  });
}

/** Day and play schools are only shown for one city (or state). Boarding schools may be browsed for all of India. */
export const isBoardingSchool = (type: string) => type === "Boarding School";
export const needsPlace = (type: string) => !!type && !isBoardingSchool(type);
