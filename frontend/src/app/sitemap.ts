import type { MetadataRoute } from "next";
import { citiesOf, stateFor, statesOf } from "./data/schools";
import { fetchAllSchoolsSafe } from "./lib/schoolsApi";
import { typePath } from "./lib/links";
import { fetchPosts } from "./lib/blogApi";
import { sectionsFor, type Scope, type TypeKey } from "./lib/browse";
import { TYPE_PATH } from "./lib/links";
import { SITE_URL, cityPath, schoolPath, statePath } from "./lib/seo";

// Rebuilt once per 24 hours; omits the 7x duplicate sub-tab URLs per school to prevent 70k+ unnecessary Vercel ISR builds!
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [schools, { posts: blogPosts }] = await Promise.all([fetchAllSchoolsSafe(), fetchPosts()]);
  const CITIES = citiesOf(schools);
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/boarding-schools/india`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...blogPosts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: new Date(p.date), changeFrequency: "monthly" as const, priority: 0.6 })),
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
    ...facetUrls(schools).map((url) => ({ url: `${SITE_URL}${url}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...schools.map((s) => ({
      url: `${SITE_URL}${schoolPath(s)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}

/** /boarding-schools/india/board/cbse, /day-schools/mumbai/gender/girls ... only pages that really have schools. */
function facetUrls(schools: Awaited<ReturnType<typeof fetchAllSchoolsSafe>>): string[] {
  const urls: string[] = [];
  const scopes: Scope[] = [{ type: "Boarding School", place: null }];
  Array.from(new Set(schools.flatMap((s) => [`${s.type}|city|${s.city}`, ...(stateFor(s) ? [`${s.type}|state|${stateFor(s)}`] : [])]))).forEach((k) => {
    const [type, kind, name] = k.split("|");
    if (!(type in TYPE_PATH)) return;
    if (kind === "state" && type !== "Boarding School") return; // day / play schools are listed per city
    scopes.push({ type: type as TypeKey, place: { kind: kind as "city" | "state", name } });
  });
  for (const scope of scopes) {
    for (const sec of sectionsFor(schools, scope)) {
      if (sec.id === "gender" || sec.id === "fees" || sec.id === "board") sec.rows.forEach((r) => urls.push(r.href));
    }
  }
  return urls;
}
