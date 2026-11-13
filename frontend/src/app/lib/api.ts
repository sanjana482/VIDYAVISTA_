// Small client for the Django backend. Set NEXT_PUBLIC_API_URL in .env.local
// (e.g. http://127.0.0.1:8000/api).
import { readPreference } from "./preferences";

let rawUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
if (!rawUrl.endsWith("/api")) {
  rawUrl += "/api";
}
export const API_URL = rawUrl;
export const BACKEND_ORIGIN = API_URL.replace(/\/api$/, "");

export type EnquiryInput = {
  schoolName: string;
  schoolId?: number;
  childName?: string;
  className?: string;
  session?: string;
  parentName: string;
  relation?: string;
  mobile: string;
  email?: string;
  city?: string;
  note?: string;
};

export async function postEnquiry(data: EnquiryInput): Promise<{ ok: boolean }> {
  const pref = readPreference();
  const token = typeof window !== "undefined" ? localStorage.getItem("vv_portal_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/enquiries/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...data,
      source: typeof window !== "undefined" ? window.location.pathname : "",
      preference: pref ?? undefined,
    }),
  });
  if (!res.ok) throw new Error(`Enquiry failed (${res.status})`);
  return { ok: true };
}
