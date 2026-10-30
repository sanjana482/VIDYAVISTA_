// Location (state / city) content that the admin edits in /admin/locations,
// plus the state -> city -> type index used by the footer and the listing.
import { API_URL } from "./api";
import { slugify } from "./seo";

export type LocationKind = "state" | "city";
export type ActiveLocation = { kind: LocationKind; name: string } | null;

export type LocationContent = {
  kind: LocationKind;
  name: string;
  slug: string;
  state?: string;
  title: string;
  metaTitle: string;
  description: string;
  photos: string[];
  highlights?: string[];
  cover?: string;
  faqs: { q: string; a: string }[];
};

export type IndexCity = { name: string; slug: string; count: number; types: Record<string, number>; boards: Record<string, number> };
export type IndexState = { state: string; slug: string; count: number; types: Record<string, number>; boards: Record<string, number>; cities: IndexCity[] };

const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
export const DEFAULT_PHOTOS = ["/images/location-1.jpg", "/images/location-2.jpg", "/images/location-3.jpg"];

export const DEFAULT_DESCRIPTION =
  "Choosing a school is easier when you can compare boards, annual fees, facilities and parent feedback in one place. VidyaVista lists CBSE, ICSE, IB, Cambridge and State Board schools across major Indian cities, with day, boarding and day-cum-boarding options.";

/** what the page shows when the admin has not written anything for this place yet */
export function resolveContent(loc: ActiveLocation, content: LocationContent | null, count?: number) {
  if (!loc) {
    return {
      title: "Best Schools in India 2027-28",
      metaTitle: "Best Schools in India 2027-28 | VidyaVista",
      description: DEFAULT_DESCRIPTION,
      photos: [] as string[],
      faqs: [] as { q: string; a: string }[],
    };
  }
  const n = loc.name;
  const title = content?.title || `Best Schools in ${n} 2027-28`;
  const lead = typeof count === "number" && count > 0 ? `Explore ${count} ${count === 1 ? "school" : "schools"} in ${n}` : `Explore schools in ${n}`;
  const description =
    content?.description ||
    `${lead}: day, boarding and day-cum-boarding options across CBSE, ICSE, IB, Cambridge and State Board. Compare annual fees, facilities and parent reviews, then enquire directly for 2027-28 admission on VidyaVista.`;
  return {
    title,
    metaTitle: content?.metaTitle || `${title} | VidyaVista`,
    description,
    photos: content?.photos ?? [],
    faqs: content?.faqs ?? [],
  };
}

/** always 3 photos: the admin's first, the default school photos fill the rest */
export const fillPhotos = (photos: string[]) => [...photos, ...DEFAULT_PHOTOS.filter((p) => !photos.includes(p))].slice(0, 3);

export async function fetchLocationContent(kind: LocationKind, name: string): Promise<LocationContent | null> {
  try {
    const res = await fetch(`${API_URL}/locations/${kind}/${slugify(name)}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()).data as LocationContent;
  } catch {
    return null;
  }
}

export async function fetchLocationIndex(): Promise<IndexState[]> {
  try {
    const res = await fetch(`${API_URL}/locations/index`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return (await res.json()).data as IndexState[];
  } catch {
    return [];
  }
}


export type HomePlace = { name: string; image: string };

/** states + cities ticked "show on homepage" in the admin (only those that have a photo) */
export async function fetchHomeLocations(): Promise<{ states: HomePlace[]; cities: HomePlace[] }> {
  try {
    const res = await fetch(`${API_URL}/locations/?page_size=100`, { next: { revalidate: 60 } });
    if (!res.ok) return { states: [], cities: [] };
    const json = await res.json();
    const rows = (json.results ?? json.data ?? []) as { kind: LocationKind; name: string; cover?: string; show_on_home?: boolean }[];
    const pick = (k: LocationKind) => rows.filter((r) => r.kind === k && r.show_on_home && r.cover).map((r) => ({ name: r.name, image: r.cover as string }));
    return { states: pick("state"), cities: pick("city") };
  } catch {
    return { states: [], cities: [] };
  }
}
