
// import { readPreference } from "./preferences";

// export const API_URL = (
//   process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
// ).replace(/\/+$/, "");

// export type EnquiryInput = {
//   schoolName: string;
//   schoolId?: number;
//   childName?: string;
//   className?: string;
//   session?: string;
//   parentName: string;
//   relation?: string;
//   mobile: string;
//   email?: string;
//   city?: string;
//   note?: string;
// };

// export async function postEnquiry(
//   data: EnquiryInput
// ): Promise<{ ok: boolean }> {
//   const pref = readPreference();

//   const res = await fetch(`${API_URL}/enquiries`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       ...data,
//       source:
//         typeof window !== "undefined"
//           ? window.location.pathname
//           : "",
//       preference: pref ?? undefined,
//     }),
//   });

//   if (!res.ok) {
//     throw new Error(`Enquiry failed (${res.status})`);
//   }

//   return { ok: true };
// }






// Loads schools from the Express/Mongo backend (the ones managed in /admin).
// Server pages call these with ISR: a new school shows up on the site within ~60 seconds.
import { API_URL } from "./api";
import type { School } from "../data/schools";

type ApiSchool = Partial<School> & { schoolId: number; name: string; area: string; city: string; state?: string };

const FALLBACK_IMAGE = "/images/school-placeholder.svg"; // shown only until a real cover photo is added in the admin

export const mapSchool = (d: ApiSchool): School => ({
  id: d.schoolId,
  name: d.name,
  area: d.area,
  city: d.city,
  state: d.state,
  board: d.board as School["board"],
  grades: d.grades ?? "",
  type: (d.type === ("Day" as string) ? "Day School" : d.type) as School["type"], // the database stores "Day"
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
  owner: d.owner ?? null,
  social: d.social && Object.keys(d.social).length ? d.social : undefined,
  reviewList: d.reviewList?.length ? d.reviewList : undefined,
});

const REVALIDATE = 60;

// async function get(path: string) {
//   try {
//     return await fetch(`${API_URL}${path}`, { next: { revalidate: REVALIDATE } });
//   } catch {
//     throw new Error(`Cannot reach the API at ${API_URL}. Is the backend running? (set NEXT_PUBLIC_API_URL)`);
//   }
// }

// this is the latest error changes after first push 



async function get(path: string) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${API_URL}${path}`, { next: { revalidate: REVALIDATE } });
      if (res.status < 500) return res;
      lastErr = new Error(`status ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    // backend so raha ho toh jagne ka time do
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }
  throw new Error(`Cannot reach the API at ${API_URL} (${lastErr instanceof Error ? lastErr.message : lastErr}). Is the backend running? (set NEXT_PUBLIC_API_URL)`);
}










/** every active school (the API returns max 50 per page, so we page through) */
export async function fetchAllSchools(): Promise<School[]> {
  const out: School[] = [];
  let page = 1;
  let pages = 1;
  do {
    const res = await get(`/schools?limit=50&page=${page}`);
    if (!res.ok) throw new Error(`Schools API failed (${res.status})`);
    const json = await res.json();
    out.push(...(json.data as ApiSchool[]).map(mapSchool));
    pages = json.meta?.pages ?? 1;
    page++;
  } while (page <= pages && page <= 40);
  return out;
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

export async function fetchSchool(id: number): Promise<School | undefined> {
  const res = await get(`/schools/${id}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`School API failed (${res.status})`);
  return mapSchool((await res.json()).data);
}