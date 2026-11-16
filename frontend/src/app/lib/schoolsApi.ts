// Loads schools from the Django backend (the ones managed in the admin).
import { API_URL } from "./api";
import type { School } from "../data/schools";

type ApiSchool = Partial<School> & {
  schoolId: number;
  name: string;
  area: string;
  city: string;
  state?: string;
  logo?: string;
  logoUrl?: string;
  logo_url?: string;
  brochureUrl?: string;
  brochure_url?: string;
  verified?: boolean;
};

const FALLBACK_IMAGE = "/images/school-placeholder.svg";

export const mapSchool = (d: ApiSchool): School => ({
  id: d.schoolId,
  name: d.name,
  area: d.area,
  city: d.city,
  state: d.state,
  board: d.board as School["board"],
  grades: d.grades ?? "",
  type: (d.type === ("Day" as string) ? "Day School" : d.type) as School["type"],
  gender: (d.gender ?? "Co-ed") as School["gender"],
  rating: Number(d.rating) || 0,
  reviews: d.reviews ?? 0,
  fee: d.fee ?? 0,
  feeMin: d.feeMin || undefined,
  feeMax: d.feeMax || undefined,
  facilities: d.facilities ?? [],
  photos: d.photos ?? 0,
  topRated: !!d.topRated,
  phone: d.phone ?? "",
  image: d.image || FALLBACK_IMAGE,
  logo: d.logo || d.logoUrl || d.logo_url || (d.profile as any)?.logo_url || (d.profile as any)?.logo || undefined,
  logoUrl: d.logoUrl || d.logo || d.logo_url || (d.profile as any)?.logo_url || undefined,
  logo_url: d.logo_url || d.logo || d.logoUrl || (d.profile as any)?.logo_url || undefined,
  brochureUrl: d.brochureUrl || (d as any).brochure_url || (d.profile as any)?.brochure_url || undefined,
  about: d.about || undefined,
  highlights: d.highlights?.length ? d.highlights : undefined,
  faqs: d.faqs?.length ? d.faqs : undefined,
  gallery: d.gallery?.length ? d.gallery : undefined,
  feeSlabs: d.feeSlabs?.length ? d.feeSlabs : undefined,
  feeNote: d.feeNote || undefined,
  feeUpdated: d.feeUpdated || undefined,
  profile: d.profile && Object.values(d.profile).some((v) => v !== undefined && v !== "" && v !== null) ? d.profile : undefined,
  slug: d.slug,
  isFeatured: !!d.isFeatured,
  isRecommended: !!d.isRecommended,
  verified: !!d.verified,
  owner: d.owner ?? null,
  social: d.social && Object.keys(d.social).length ? d.social : undefined,
  reviewList: d.reviewList?.length ? d.reviewList : undefined,
  admissionStatus: d.admissionStatus,
  admissionLabel: d.admissionLabel || undefined,
  admissionSession: d.admissionSession || undefined,
  admissionLastDate: d.admissionLastDate || undefined,
});

const REVALIDATE = process.env.NODE_ENV === "development" ? 60 : 86400; // 60s in dev for smooth reloads; 24h in prod to prevent Vercel ISR quota burn
const PAGE = 300; // schools per request

async function get(path: string, customRevalidate?: number) {
  let lastErr: unknown;
  const reval = customRevalidate !== undefined ? customRevalidate : REVALIDATE;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        next: { revalidate: reval },
      });
      if (res.status < 500) return res;
      lastErr = new Error(`status ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  throw new Error(`Cannot reach the API at ${API_URL} (${lastErr instanceof Error ? lastErr.message : lastErr}). Is the backend running? (set NEXT_PUBLIC_API_URL)`);
}

/** every active school (light data, 300 per request, remaining pages are fetched in controlled batches) */
export async function fetchAllSchools(): Promise<School[]> {
  try {
    const first = await get(`/schools/?limit=${PAGE}&page=1`);
    if (!first.ok) throw new Error(`Schools API failed (${first.status})`);
    const j1 = await first.json();
    const maxPages = process.env.NODE_ENV === "development" ? 2 : 15;
    const totalPages = Math.min(j1.meta?.pages ?? 1, maxPages);

    // Fetch in small batches of 3 requests at a time to prevent server socket saturation
    const rest: ApiSchool[][] = [];
    for (let i = 2; i <= totalPages; i += 3) {
      const batchIndices: number[] = [];
      for (let b = 0; b < 3 && i + b <= totalPages; b++) {
        batchIndices.push(i + b);
      }
      const batchRes = await Promise.all(
        batchIndices.map(async (pageNum) => {
          try {
            const res = await get(`/schools/?limit=${PAGE}&page=${pageNum}`);
            if (!res.ok) return [];
            return ((await res.json()).data as ApiSchool[]) || [];
          } catch (e) {
            console.warn(`[schools] Failed to fetch page ${pageNum}:`, e);
            return [];
          }
        })
      );
      rest.push(...batchRes);
    }
    return ([] as ApiSchool[]).concat(j1.data as ApiSchool[], ...rest.flat()).map(mapSchool);
  } catch (err) {
    console.warn("[schools] fetchAllSchools graceful fallback:", err);
    return [];
  }
}

/** same as above but never throws - for generateStaticParams / sitemap during a build without backend */
export async function fetchAllSchoolsSafe(): Promise<School[]> {
  try {
    return await fetchAllSchools();
  } catch (e) {
    console.warn("[schools] " + (e instanceof Error ? e.message : e));
    return [];
  }
}

/** one school by its numeric id (old links like /schools/9) */
export async function fetchSchool(id: number): Promise<School | undefined> {
  const res = await get(`/schools/${id}/`, 0);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`School API failed (${res.status})`);
  return mapSchool((await res.json()).data);
}

/** one school by its slug: a single request, this is what the school page uses */
export async function fetchSchoolBySlug(slug: string): Promise<School | undefined> {
  const res = await get(`/schools/by-slug/${encodeURIComponent(slug)}/`, 0);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`School API failed (${res.status})`);
  return mapSchool((await res.json()).data);
}

/** schools in the same city (instead of downloading every school) */
export async function fetchSimilarSchools(s: School, limit = 6): Promise<School[]> {
  try {
    const res = await get(`/schools/?city=${encodeURIComponent(s.city)}&limit=${limit + 1}`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as ApiSchool[]).map(mapSchool).filter((x) => x.id !== s.id).slice(0, limit);
  } catch {
    return [];
  }
}
