import type { School } from "../data/schools";
import type { Metadata } from 'next'

export function schoolMetadata(id: string, section: Section): Metadata {
  return {
    title: `${section} | School ${id} | VidyaVista`,
    description: `${section} details for this school on VidyaVista.`,
  }
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://vidyavista.vercel.app/").replace(/\/$/, "");
export const SITE_NAME = "VidyaVista";

export const abs = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** SEO friendly path: /schools/maplewood-academy-whitefield-bengaluru-1  (id is always last) */
export const schoolSlug = (s: School) => s.slug || `${slugify(`${s.name} ${s.area} ${s.city}`)}`;
export const schoolPath = (s: School) => `/schools/${schoolSlug(s)}`;
export const SECTIONS = ["fees", "facilities", "admission", "contact", "photos", "reviews", "faqs"] as const;
export type Section = typeof SECTIONS[number];

export const SECTION_LABEL: Record<Section, string> = {
  fees: "Fees", facilities: "Facilities", admission: "Admission", contact: "Contact",
  photos: "Photos", reviews: "Reviews", faqs: "FAQs",
};
export const schoolSectionPath = (s: School, section?: Section) =>
  section ? `${schoolPath(s)}/${section}` : schoolPath(s);

/** Accepts "1" or "maplewood-academy-whitefield-bengaluru-1" and returns the numeric id. */
export function idFromParam(param: string): string {
  const m = param.match(/(\d+)$/);
  return m ? m[1] : param;
}

export const cityPath = (city: string) => `/schools-in/${slugify(city)}`;
export const statePath = (state: string) => `/schools-in/state/${slugify(state)}`;

export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
