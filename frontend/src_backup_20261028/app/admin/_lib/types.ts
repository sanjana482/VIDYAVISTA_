import type { SchoolFeeSlab } from "../../data/schools";

export type Admin = { _id: string; name: string; email: string; role: string; lastLoginAt?: string };

export type AdminSchool = {
  _id: string;
  schoolId: number;
  slug: string;
  name: string;
  area: string;
  city: string;
  state: string;
  board: string;
  grades: string;
  type: string;
  gender: string;
  rating: number;
  reviews: number;
  fee: number;
  facilities: string[];
  photos: number;
  topRated: boolean;
  phone?: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // profile page content (all optional)
  about?: string;
  highlights?: string[];
  faqs?: Faq[];
  gallery?: string[];
  feeSlabs?: SchoolFeeSlab[];
  feeNote?: string;
  feeUpdated?: string;
  profile?: Record<string, string | number | undefined>;
};

export type Faq = { q: string; a: string };

export type LocationKind = "state" | "city";
export type AdminLocation = {
  kind: LocationKind;
  name: string;
  slug: string;
  state?: string;
  title: string;
  metaTitle: string;
  description: string;
  photos: string[];
  faqs: Faq[];
  isActive: boolean;
};
export type LocationRow = {
  kind: LocationKind; name: string; slug: string; state: string; schools: number;
  hasContent: boolean; title: string; photos: number; faqs: number; isActive: boolean; updatedAt?: string;
};

export type SchoolInput = Omit<AdminSchool, "_id" | "schoolId" | "slug" | "createdAt" | "updatedAt">;

export type EnquiryStatus = "new" | "contacted" | "converted" | "closed";

export type AdminEnquiry = {
  _id: string;
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
  adminNote?: string;
  source?: string;
  preference?: { type?: string; location?: string };
  status: EnquiryStatus;
  createdAt: string;
};

export type Paged<T, M = object> = { data: T[]; meta: { total: number; page: number; limit: number; pages: number } & M };

export type Pair = { label: string; value: number };

export type Stats = {
  schools: { total: number; active: number; inactive: number; topRated: number };
  enquiries: {
    total: number;
    today: number;
    last7: number;
    prev7: number;
    status: Record<EnquiryStatus, number>;
    conversion: number;
    daily: { date: string; value: number }[];
    topSchools: Pair[];
    topCities: Pair[];
  };
  schoolsByCity: Pair[];
  schoolsByBoard: Pair[];
  schoolsByType: Pair[];
  attention: { noImage: number; noPhone: number; unrated: number; inactive: number };
  recentEnquiries: AdminEnquiry[];
};
