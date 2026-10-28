import { citiesOf, statesOf, type School } from "../data/schools";
import { slugify } from "./seo";

export const STATE_LIST = [
  "Maharashtra", "Delhi", "Gujarat", "Karnataka", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh",
  "Tamil Nadu", "Telangana", "West Bengal", "Haryana", "Kerala", "Punjab", "Bihar", "Goa",
  "Andhra Pradesh", "Odisha", "Assam", "Jharkhand", "Uttarakhand",
];

export const CITY_LIST = [
  "Mumbai", "Thane", "Navi Mumbai", "Pune", "Nashik", "Nagpur", "Bengaluru", "New Delhi", "Jaipur",
  "Ahmedabad", "Surat", "Hyderabad", "Chennai", "Kolkata", "Lucknow", "Noida", "Gurugram", "Faridabad",
  "Ghaziabad", "Bhopal", "Indore", "Vadodara", "Mysuru", "Kochi", "Patna", "Chandigarh",
];

export const OPEN_PICKER_EVENT = "vv-open-picker";

/** Navbar / Hero se location panel kholne ke liye */
export const openLocationPicker = (type?: string, q?: string) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_PICKER_EVENT, { detail: { type, q } }));
};

/** "nashik" -> "Nashik" (sirf dikhane ke liye) */
export const pretty = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** URL ka slug -> state ya city. Database wala naam pehle (filter usi se match hota hai). */
export function resolvePlace(slug: string, schools: School[]) {
  const state = [...statesOf(schools), ...STATE_LIST].find((x) => slugify(x) === slug);
  if (state) return { kind: "state" as const, name: state };
  const city = [...citiesOf(schools), ...CITY_LIST].find((x) => slugify(x) === slug);
  if (city) return { kind: "city" as const, name: city };
  return null;
}