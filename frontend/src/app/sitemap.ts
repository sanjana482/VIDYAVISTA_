import type { MetadataRoute } from "next";
import { citiesOf, stateFor, statesOf } from "./data/schools";
import { fetchAllSchoolsSafe } from "./lib/schoolsApi";
import { typePath } from "./lib/links";
import { SECTIONS, SITE_URL, cityPath, schoolPath, schoolSectionPath, statePath } from "./lib/seo";

// Auto-generated at /sitemap.xml from the live schools in the database.
export const revalidate = 3600;

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
    // /day-schools/pune etc: only combinations that really have schools
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
        ...schools.flatMap((s) =>
      SECTIONS.map((sec) => ({
        url: `${SITE_URL}${schoolSectionPath(s, sec)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }))
    ),
  ];
}
