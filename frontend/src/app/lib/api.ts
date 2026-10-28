// Small client for the Django backend. Set NEXT_PUBLIC_API_URL in .env.local
// (e.g. http://127.0.0.1:8000/api).
import { readPreference } from "./preferences";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

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
  const res = await fetch(`${API_URL}/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      source: typeof window !== "undefined" ? window.location.pathname : "",
      preference: pref ?? undefined,
    }),
  });
  if (!res.ok) throw new Error(`Enquiry failed (${res.status})`);
  return { ok: true };
}
