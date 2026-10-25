import { slugify } from "./seo";

// Link helpers shared by the listing, the footer and the SEO landing pages.
export const TYPE_ORDER = ["Boarding School", "Play School", "Day School"] as const;

export const typeLabel = (t: string) =>
  t === "Boarding School" ? "Boarding Schools" : t === "Day School" ? "Day Schools" : "Play School Schools";

export function listingHref(p: { type?: string; board?: string; city?: string; state?: string }) {
  const qs = new URLSearchParams();
  (["type", "board", "city", "state"] as const).forEach((k) => p[k] && qs.set(k, p[k] as string));
  const q = qs.toString();
  return q ? `/schools?${q}` : "/schools";
}

/** Clean, Google-friendly URLs: /day-schools/pune, /boarding-schools/maharashtra, /play-schools/mumbai */
export const TYPE_PATH: Record<string, string> = {
  "Day School": "day-schools",
  "Boarding School": "boarding-schools",
  "Play School": "play-schools",
};
export const typePath = (type: string, place: string) => `/${TYPE_PATH[type] ?? "day-schools"}/${slugify(place)}`;

/** "Day School" -> "Day Schools" (used in headings) */
export const typePlural = (t: string) => (t ? `${t}s` : "Schools");
