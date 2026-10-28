// Cookie based user preference (school type + city/state).
// Cookie name: vv_pref  |  value: URL-encoded JSON  |  expiry: 1 year
//
// Flow:
//   1. First visit  -> no cookie -> DEFAULT_PREF (Boarding Schools)
//   2. User picks type + city/state -> savePreference() writes the cookie
//   3. Refresh / close & reopen / come back to Home or /schools -> readPreference()
//      returns the saved values, so everything is pre-selected.

export type SchoolTypeLabel = "Day Schools" | "Boarding Schools" | "Play School";

export type Preference = {
  type: SchoolTypeLabel;
  /** City for Day / Day-Boarding, State for Boarding. Empty string = not chosen yet. */
  location: string;
};

export const COOKIE_NAME = "vv_pref";
/** fired after the cookie changes so Hero / Footer / Listing can re-read the selected location */
export const PREF_EVENT = "vv-pref";
const notify = () => typeof window !== "undefined" && window.dispatchEvent(new Event(PREF_EVENT));
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export const DEFAULT_PREF: Preference = { type: "Boarding Schools", location: "" };

const VALID_TYPES: SchoolTypeLabel[] = ["Day Schools", "Boarding Schools", "Play School"];

export const isBoardingType = (t: string) => t === "Boarding Schools";

export function readPreference(): Preference | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!raw) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw.slice(COOKIE_NAME.length + 1)));
    if (!VALID_TYPES.includes(data?.type)) return null;
    return {
      type: data.type,
      location: typeof data.location === "string" ? data.location.slice(0, 60) : "",
    };
  } catch {
    return null;
  }
}

export function savePreference(pref: Preference) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(pref))}` +
    `; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  notify();
}

export function clearPreference() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  notify();
}

// ---- helpers used by Hero / listing so both pages speak the same language ----

/** Hero labels ("Day Schools") and URL values -> the values stored in school data ("Day School"). */
export function normalizeType(t: string): "Day School" | "Boarding School" | "Play School" | "" {
  const v = t.trim().toLowerCase();
  if (v === "day schools" || v === "day school") return "Day School";
  if (v === "boarding schools" || v === "boarding school") return "Boarding School";
  if (v === "play school" || v === "play schools" || v === "day-boarding") return "Play School";
  return "";
}

/** School data value -> Hero label (used when listing filters are saved back to the cookie). */
export function toHeroType(t: string): SchoolTypeLabel {
  if (t === "Boarding School") return "Boarding Schools";
  if (t === "Play School") return "Play School";
  return "Day Schools";
}

/** Home / listing sections list Boarding first: 0 = boarding, 1 = Play School, 2 = day */
export function typeRank(t: string): number {
  const v = t.toLowerCase();
  const boarding = v.includes("boarding");
  const day = v.includes("day");
  if (boarding && !day) return 0;
  if (boarding && day) return 1;
  return 2;
}
