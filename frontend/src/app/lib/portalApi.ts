"use client";

import { API_URL } from "./api";

export const TOKEN_KEY = "vv_portal_token";
export const USER_KEY = "vv_portal_user";

export type PortalUser = {
  role: "school" | "parent" | "admin";
  id: number;
  name: string;
  institutionName?: string;
  studentName?: string;
  schoolId?: number | null;
  schoolSlug?: string | null;
  email: string;
  mobile?: string;
  status?: string;
  schoolLinkStatus?: "none" | "pending_claim" | "pending_new" | "approved" | "rejected";
  editApprovalStatus?: "none" | "pending" | "approved" | "rejected";
  leadsRemaining?: number;
  profileCompletion?: number;
};

export type CaptchaChallenge = {
  captchaToken: string;
  captchaCode: string;
};

export type PortalPlan = {
  id: number;
  name: string;
  code: string;
  planType: "yearly" | "topup" | "pay_per_admission" | "free";
  price: number;
  gstPercent: number;
  gstAmount: number;
  totalPrice: number;
  validityDays: number;
  leadsIncluded: number;
  grantsFeatured: boolean;
  grantsRecommended: boolean;
  grantsTopRated: boolean;
  grantsVerified: boolean;
  description: string;
  features: string[];
  isPopular: boolean;
};

export type PortalInvoice = {
  id: number;
  invoiceNumber: string;
  recipientName: string;
  recipientAddress: string;
  recipientGstin: string;
  planDescription: string;
  subtotal: number;
  discount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  paymentMode: string;
  status: string;
  issuedDate: string;
};

export type PortalMembership = {
  id: number;
  planName: string;
  planType: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  leadsTotal: number;
  leadsUsed: number;
  leadsRemaining: number;
  amount: number;
  discount: number;
  gstPercent: number;
  gstAmount: number;
  totalPaid: number;
  paymentMode: string;
  paymentNote: string;
  status: string;
  invoice: PortalInvoice | null;
};

export type SchoolLead = {
  id: number;
  schoolId: number | null;
  schoolName: string;
  childName: string;
  className: string;
  session: string;
  parentName: string;
  relation: string;
  mobile: string;
  email: string;
  canCall: boolean;
  isUnlocked: boolean;
  unlockedAt: string | null;
  creditUsed: boolean;
  city: string;
  preferredLocation: string;
  institutionType: string;
  note: string;
  leadSourceTag: string;
  schoolStatus: "pending" | "accepted" | "rejected" | "review_requested" | "refunded";
  schoolNote: string;
  rejectionReason: string;
  reviewReason: string;
  followupDate: string;
  createdAt: string;
  messagesCount: number;
};

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredPortalUser(): PortalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PortalUser) : null;
  } catch {
    return null;
  }
}

export function setPortalSession(token: string, user: PortalUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("vv-auth-changed"));
}

export function clearPortalSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("vv-auth-changed"));
}

export async function portalApi<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getPortalToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || json.detail || `Request failed (${res.status})`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = json.code;
    throw err;
  }
  return json as T;
}

export async function fetchCaptcha(): Promise<CaptchaChallenge> {
  const res = await portalApi<{ ok: boolean; captchaToken: string; captchaCode: string }>("/portal/auth/captcha");
  return { captchaToken: res.captchaToken, captchaCode: res.captchaCode };
}

export async function portalUpload(file: File): Promise<{ ok: boolean; url: string; filename?: string; isImage?: boolean; isDoc?: boolean }> {
  const fd = new FormData();
  fd.append("file", file);
  return portalApi<{ ok: boolean; url: string; filename?: string; isImage?: boolean; isDoc?: boolean }>("/portal/school/upload", {
    method: "POST",
    body: fd,
  });
}
