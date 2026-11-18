// One place that decides: "which categories (by gender, fees, board, region, city, area) belong to this page?"
// The homepage, the India boarding hub, the city pages and the facet pages all read from here,
// so the numbers always agree and every row is a real, crawlable link.
import { BOARDS, BOARD_LABEL, GENDERS, stateFor, type School } from "../data/schools";
import { FEE_BANDS, GENDER_LABEL, countBy, type FinderState } from "./finder";
import { TYPE_PATH, typePlural, listingHref } from "./links";
import { pretty } from "./places";
import { slugify } from "./seo";

export type TypeKey = "Day School" | "Boarding School" | "Play School";
/** null place = all of India (allowed for boarding schools only) */
export type Place = { kind: "state" | "city"; name: string } | null;
export type Scope = { type: TypeKey; place: Place };
export type FacetId = "gender" | "fees" | "board" | "region" | "city" | "area";
export type Row = { key: string; label: string; sub?: string; count: number; href: string };
export type Section = { id: FacetId; title: string; intro: string; rows: Row[] };

export const BOARD_NOTE: Record<string, string> = {
  CBSE: "Central Board of Secondary Education",
  ICSE: "Council for the Indian School Certificate Examinations",
  IB: "International Baccalaureate programmes",
  Cambridge: "Cambridge IGCSE and A Level",
  "State Board": "The state’s own curriculum",
  NIOS: "National Institute of Open Schooling",
};

export const scopeBase = (s: Scope) => `/${TYPE_PATH[s.type]}/${s.place ? slugify(s.place.name) : "india"}`;
export const whereText = (s: Scope) => (s.place ? `in ${pretty(s.place.name)}` : "in India");
export const scopeHeading = (s: Scope) => `${typePlural(s.type)} ${whereText(s)}`;

export function scopeSchools(schools: School[], s: Scope): School[] {
  return schools.filter(
    (x) =>
      x.type === s.type &&
      (!s.place || (s.place.kind === "city" ? x.city === s.place.name : stateFor(x) === s.place.name))
  );
}

/** the stacked "by gender / by fees / by board / ..." sections of a scope */
export function sectionsFor(schools: School[], scope: Scope): Section[] {
  const pool = scopeSchools(schools, scope);
  const base = scopeBase(scope);
  const head = scopeHeading(scope);
  const out: Section[] = [];

  const gender = GENDERS.map((g) => ({
    key: g,
    label: GENDER_LABEL[g] ?? g,
    count: pool.filter((s) => s.gender === g).length,
    href: `${base}/gender/${slugify(g)}`,
  })).filter((r) => r.count > 0);
  if (gender.length) out.push({ id: "gender", title: `${head} by gender`, intro: "Boys only, girls only or co-ed campuses.", rows: gender });

  const fees = FEE_BANDS.slice(1)
    .map((b) => {
      const min = b.min ? Number(b.min) : 0;
      const max = b.max ? Number(b.max) : Infinity;
      return { key: b.id, label: b.label, count: pool.filter((s) => s.fee > 0 && s.fee >= min && s.fee <= max).length, href: `${base}/fees/${b.slug}` };
    })
    .filter((r) => r.count > 0);
  if (fees.length) out.push({ id: "fees", title: `${head} by annual fees`, intro: "Annual tuition bands. Fees are indicative.", rows: fees });

  const boards = countBy(pool, (s) => s.board)
    .map((o) => ({ key: o.value, label: BOARD_LABEL[o.value] ?? o.value, sub: BOARD_NOTE[o.value], count: o.count, href: `${base}/board/${slugify(o.value)}` }));
  if (boards.length) out.push({ id: "board", title: `${head} by board`, intro: "CBSE, ICSE, IB, Cambridge, State Board and more.", rows: boards });

  // India-wide boarding: regions (states), then cities
  if (!scope.place) {
    const regions = countBy(pool, (s) => stateFor(s)).map((o) => ({ key: o.value, label: o.value, count: o.count, href: `/${TYPE_PATH[scope.type]}/${slugify(o.value)}` }));
    if (regions.length) out.push({ id: "region", title: `${head} by state or region`, intro: "Pick a state to see its boarding schools.", rows: regions });
  }
  if (!scope.place || scope.place.kind === "state") {
    const cities = countBy(pool, (s) => s.city).map((o) => ({
      key: o.value, label: pretty(o.value), sub: scope.place ? undefined : stateFor(pool.find((s) => s.city === o.value) as School) || undefined,
      count: o.count, href: `/${TYPE_PATH[scope.type]}/${slugify(o.value)}`,
    }));
    if (cities.length) out.push({ id: "city", title: `${head} by city`, intro: "Schools grouped by the city they are in.", rows: cities });
  }
  if (scope.place?.kind === "city") {
    const areas = countBy(pool, (s) => s.area).map((o) => ({ key: o.value, label: o.value, count: o.count, href: `${base}/area/${slugify(o.value)}` }));
    if (areas.length) out.push({ id: "area", title: `${head} by area`, intro: "Neighbourhoods and localities in this city.", rows: areas });
  }
  return out;
}

// ------------------------------------------------------------------ facet pages (/boarding-schools/india/board/cbse)
export type Facet = {
  /** words before the type, e.g. "CBSE " -> "Best CBSE Boarding Schools in India" */
  prefix: string;
  /** words after the place, e.g. " with Annual Fees Under ₹50,000" */
  suffix: string;
  /** replaces "in Mumbai" when the facet is an area ("in Andheri, Mumbai") */
  where?: string;
  label: string;
  match: (s: School) => boolean;
  /** extra filters handed to the interactive listing */
  listing: { board?: string; gender?: string; area?: string; min?: string; max?: string };
};

export const FACET_KEYS = ["gender", "fees", "board", "area"] as const;

export function resolveFacet(facet: string, value: string, pool: School[], place: Place): Facet | null {
  if (facet === "gender") {
    const g = GENDERS.find((x) => slugify(x) === value);
    if (!g) return null;
    return { prefix: `${g} `, suffix: "", label: GENDER_LABEL[g] ?? g, match: (s) => s.gender === g, listing: { gender: g } };
  }
  if (facet === "board") {
    const b = Array.from(new Set([...BOARDS, ...pool.map((s) => s.board)])).find((x) => slugify(String(x)) === value);
    if (!b) return null;
    const label = BOARD_LABEL[b] ?? String(b);
    return { prefix: `${label} `, suffix: "", label: `${label} board`, match: (s) => s.board === b, listing: { board: String(b) } };
  }
  if (facet === "fees") {
    const band = FEE_BANDS.find((x) => x.slug && x.slug === value);
    if (!band) return null;
    const min = band.min ? Number(band.min) : 0;
    const max = band.max ? Number(band.max) : Infinity;
    return {
      prefix: "", suffix: ` with Annual Fees ${band.label}`, label: band.label,
      match: (s) => s.fee > 0 && s.fee >= min && s.fee <= max, listing: { min: band.min, max: band.max },
    };
  }
  if (facet === "area") {
    if (!place || place.kind !== "city") return null;
    const a = Array.from(new Set(pool.map((s) => s.area).filter(Boolean))).find((x) => slugify(x) === value);
    if (!a) return null;
    return { prefix: "", suffix: "", where: `in ${a}, ${pretty(place.name)}`, label: a, match: (s) => s.area === a, listing: { area: a } };
  }
  return null;
}

/** Where does "Show schools" on the home page go? A clean, indexable URL whenever possible. */
export function finderTarget(f: FinderState): string {
  if (!f.type) return "/";
  const type = f.type as TypeKey;
  const place = f.city || f.state;
  const base = `/${TYPE_PATH[type]}/${place ? slugify(place) : "india"}`;
  const extras = [f.board && "board", f.gender && "gender", f.fee && "fees", f.area && "area", f.cls && "cls"].filter(Boolean) as string[];
  if (type !== "Boarding School" && !place) return "/";
  if (extras.length === 0) return base;
  if (extras.length === 1 && extras[0] !== "cls") {
    const fee = FEE_BANDS.find((b) => b.id === f.fee);
    const v = extras[0] === "board" ? slugify(f.board) : extras[0] === "gender" ? slugify(f.gender) : extras[0] === "fees" ? fee?.slug : slugify(f.area);
    if (v && (extras[0] !== "area" || f.city)) return `${base}/${extras[0]}/${v}`;
  }
  const b = FEE_BANDS.find((x) => x.id === f.fee);
  return listingHref({ type: f.type, board: f.board, city: f.city, state: f.state, area: f.area, gender: f.gender, cls: f.cls, min: b?.min, max: b?.max });
}
