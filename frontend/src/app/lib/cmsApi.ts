import { API_URL } from "./api";

export type CMSSection = {
  title: string;
  body: string;
  points?: string[];
};

export type CMSFaq = {
  q: string;
  a: string;
};

export type CMSPageData = {
  id: number;
  slug: string;
  title: string;
  category: string;
  subtitle?: string;
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string;
  content_html?: string;
  sections: CMSSection[];
  faqs: CMSFaq[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchCMSPage(slug: string): Promise<CMSPageData | null> {
  try {
    const res = await fetch(`${API_URL}/cms-pages/${slug}/`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as CMSPageData;
  } catch {
    return null;
  }
}
