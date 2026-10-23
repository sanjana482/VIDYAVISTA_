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
  faqs: { q: string; a: string }[];
};

export type IndexCity = { name: string; slug: string; count: number; types: Record<string, number>; boards: Record<string, number> };
export type IndexState = { state: string; slug: string; count: number; types: Record<string, number>; boards: Record<string, number>; cities: IndexCity[] };

const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
export const DEFAULT_PHOTOS = [
  unsplash("photo-1580582932707-520aed937b7b"),
  unsplash("photo-1509062522246-3755977927d7"),
  unsplash("photo-1523050854058-8df90110c9f1"),
];

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
