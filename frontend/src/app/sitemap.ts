import type { MetadataRoute } from "next";
import { citiesOf, stateFor, statesOf } from "./data/schools";
import { fetchAllSchoolsSafe } from "./lib/schoolsApi";
import { typePath } from "./lib/links";
import { SITE_URL, cityPath, schoolPath, statePath } from "./lib/seo";

// Rebuilt once per 24 hours; omits the 7x duplicate sub-tab URLs per school to prevent 70k+ unnecessary Vercel ISR builds!
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const schools = await fetchAllSchoolsSafe();
  const CITIES = citiesOf(schools);
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/schools`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...statesOf(schools).map((st) => ({
      url: `${SITE_URL}${statePath(st)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...CITIES.map((c) => ({
      url: `${SITE_URL}${cityPath(c)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...Array.from(
      new Set(schools.flatMap((s) => [`${s.type}|${s.city}`, ...(stateFor(s) ? [`${s.type}|${stateFor(s)}`] : [])]))
    ).map((k) => {
      const [type, place] = k.split("|");
      return { url: `${SITE_URL}${typePath(type, place)}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.85 };
    }),
    ...schools.map((s) => ({
      url: `${SITE_URL}${schoolPath(s)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
