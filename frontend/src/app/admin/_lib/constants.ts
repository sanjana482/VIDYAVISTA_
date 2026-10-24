import type { EnquiryStatus } from "./types";

export const BOARDS = ["CBSE", "ICSE", "IB", "Cambridge", "State Board"] as const;
export const TYPES = ["Day School", "Boarding School", "Play School"] as const;
export const GENDERS = ["Co-ed", "Girls", "Boys"] as const;

export const FACILITY_SUGGESTIONS = [
  "Transport", "Sports", "Science labs", "Library", "Computer lab", "Hostel", "Swimming pool",
  "Smart classes", "Music & Arts", "Cafeteria", "Medical room", "CCTV", "Playground", "Auditorium",
];

export const INDIA_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export const STATUS_META: Record<EnquiryStatus, { label: string; chip: string; dot: string }> = {
  new: { label: "New", chip: "bg-[#FDE8EF] text-[#C8104F]", dot: "#EC0E58" },
  contacted: { label: "Contacted", chip: "bg-[#E1F1FA] text-[#0A5C91]", dot: "#0795DC" },
  converted: { label: "Converted", chip: "bg-emerald-50 text-emerald-700", dot: "#059669" },
  closed: { label: "Closed", chip: "bg-slate-100 text-slate-600", dot: "#8896A6" },
};

export const STATUSES = Object.keys(STATUS_META) as EnquiryStatus[];

export const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export const fmtDate = (iso: string, withTime = true) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

export const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(iso, false);
};
