// Blog posts come from the Django backend (Admin > Blog posts). Nothing is hard-coded here.
import { API_URL } from "./api";

export type BlogCardData = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  /** YYYY-MM-DD, the date the admin picked */
  date: string;
  author: string;
  /** photo uploaded by the admin, "" when there is none */
  cover: string;
  coverAlt: string;
  readingMinutes: number;
};

export type BlogPost = BlogCardData & {
  bodyHtml: string;
  metaTitle: string;
  metaDescription: string;
  updatedAt: string;
  cta: { label: string; href: string } | null;
  related: BlogCardData[];
};

const REVALIDATE = process.env.NODE_ENV === "development" ? 30 : 3600;

async function get(path: string) {
  return fetch(`${API_URL}${path}`, { next: { revalidate: REVALIDATE, tags: ["blog"] } });
}

export async function fetchPosts(limit?: number): Promise<{ posts: BlogCardData[]; categories: string[] }> {
  try {
    const res = await get(`/blog/${limit ? `?limit=${limit}` : ""}`);
    if (!res.ok) return { posts: [], categories: [] };
    const j = await res.json();
    return { posts: (j.data as BlogCardData[]) ?? [], categories: (j.categories as string[]) ?? [] };
  } catch {
    return { posts: [], categories: [] };
  }
}

export async function fetchPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await get(`/blog/${encodeURIComponent(slug)}/`);
    if (!res.ok) return null;
    return ((await res.json()).data as BlogPost) ?? null;
  } catch {
    return null;
  }
}

export const formatPostDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
