// Sample listing data. Replace with your API / database response when the backend is ready.
import { fetchAllSchools } from "../lib/schoolsApi";

export type School = {
  id: number;
  name: string;
  area: string;
  city: string; // any city: new ones come from the admin panel
  state?: string;
  board: "CBSE" | "ICSE" | "IB" | "Cambridge" | "State Board";
  grades: string;
  type: "Day School" | "Boarding School" | "Play School";
  gender: "Co-ed" | "Girls" | "Boys";
  rating: number;
  reviews: number;
  fee: number; // annual tuition in INR
  feeMin?: number;
  feeMax?: number;
  facilities: string[];
  photos: number;
  topRated?: boolean;
  phone: string;
  image: string;
  // ---- optional profile content edited in /admin (the website falls back to generated text) ----
  about?: string;
  highlights?: string[];
  faqs?: { q: string; a: string }[];
  gallery?: string[];
  feeSlabs?: SchoolFeeSlab[];
  feeNote?: string;
  feeUpdated?: string;
  profile?: SchoolProfileOverrides;
};

export type FeeFreq = "One-time" | "Monthly" | "Annually";
export type SchoolFeeSlab = { session: string; cls: string; stage?: string; rows: { label: string; freq: FeeFreq; amount: number }[] };
export type SchoolProfileOverrides = {
  established?: number; students?: number; ratio?: number; campus?: string;
  address?: string; email?: string; website?: string;
  admissionStatus?: string; admissionSummary?: string; documents?: string;
};

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Pune", "Hyderabad", "Chennai"] as const;
export const TYPES = ["Day School", "Boarding School", "Play School"] as const;
export const BOARDS = ["CBSE", "ICSE", "IB", "Cambridge", "State Board"] as const;
export const GENDERS = ["Co-ed", "Girls", "Boys"] as const;

// City -> State (needed for the "Boarding School -> State" filter). Add new cities here.
export const CITY_STATE: Record<string, string> = {
  Mumbai: "Maharashtra",
  Pune: "Maharashtra",
  Delhi: "Delhi",
  Bengaluru: "Karnataka",
  Hyderabad: "Telangana",
  Chennai: "Tamil Nadu",
};
export const stateOf = (city: string) => CITY_STATE[city] ?? "";
// state of a school: saved value first, else the old city table
export const stateFor = (s: { city: string; state?: string }) => s.state || stateOf(s.city);
// filter lists built from whatever schools are live (so new cities / states appear automatically)
export const citiesOf = (list: { city: string }[]) => Array.from(new Set(list.map((s) => s.city))).sort();
export const statesOf = (list: { city: string; state?: string }[]) => Array.from(new Set(list.map(stateFor).filter(Boolean))).sort();
export const STATES = Array.from(new Set(Object.values(CITY_STATE)));

export const schools: School[] = [
  {
    id: 1, name: "Maplewood Academy", area: "Whitefield", city: "Bengaluru",
    board: "CBSE", grades: "Nursery – XII", type: "Day School", gender: "Co-ed",
    rating: 4.7, reviews: 128, fee: 145000, facilities: ["Transport", "Sports", "Science labs"],
    photos: 8, topRated: true, phone: "+910000000001", image: img("photo-1580582932707-520aed937b7b"),
  },
  {
    id: 2, name: "Cedar Grove Public School", area: "Dwarka", city: "Delhi",
    board: "CBSE", grades: "Nursery – XII", type: "Play School", gender: "Co-ed",
    rating: 4.7, reviews: 96, fee: 210000, facilities: ["Science labs", "Library", "Hostel"],
    photos: 12, topRated: true, phone: "+910000000002", image: img("photo-1509062522246-3755977927d7"),
  },
  {
    id: 3, name: "Greenfield Public School", area: "Kandivali", city: "Mumbai",
    board: "CBSE", grades: "Nursery – XII", type: "Day School", gender: "Co-ed",
    rating: 4.6, reviews: 103, fee: 48000, facilities: ["Transport", "Library", "Computer lab"],
    photos: 5, phone: "+910000000003", image: img("photo-1562774053-701939374585"),
  },
  {
    id: 4, name: "Sunrise International School", area: "Powai", city: "Mumbai",
    board: "ICSE", grades: "Nursery – X", type: "Day School", gender: "Co-ed",
    rating: 4.5, reviews: 76, fee: 185000, facilities: ["Science labs", "Sports", "Transport"],
    photos: 8, phone: "+910000000004", image: img("photo-1523050854058-8df90110c9f1"),
  },
  {
    id: 5, name: "Riverstone International School", area: "Koregaon Park", city: "Pune",
    board: "IB", grades: "Nursery – XII", type: "Play School", gender: "Co-ed",
    rating: 4.6, reviews: 64, fee: 320000, facilities: ["Hostel", "Sports", "Library"],
    photos: 10, phone: "+910000000005", image: img("photo-1564981797816-1043664bf78d"),
  },
  {
    id: 6, name: "Lotus Valley School", area: "Gachibowli", city: "Hyderabad",
    board: "Cambridge", grades: "Nursery – XII", type: "Day School", gender: "Co-ed",
    rating: 4.4, reviews: 58, fee: 175000, facilities: ["Transport", "Computer lab", "Sports"],
    photos: 6, phone: "+910000000006", image: img("photo-1570168007204-dfb528c6958f"),
  },
  {
    id: 7, name: "St. Anne's Girls' School", area: "Adyar", city: "Chennai",
    board: "State Board", grades: "I – XII", type: "Day School", gender: "Girls",
    rating: 4.3, reviews: 41, fee: 62000, facilities: ["Library", "Transport", "Science labs"],
    photos: 4, phone: "+910000000007", image: img("photo-1567157577867-8d16e90f1571"),
  },
  {
    id: 8, name: "Hillcrest Boarding School", area: "Mulshi", city: "Pune",
    board: "ICSE", grades: "V – XII", type: "Boarding School", gender: "Boys",
    rating: 4.2, reviews: 33, fee: 275000, facilities: ["Hostel", "Sports", "Library"],
    photos: 9, phone: "+910000000008", image: img("photo-1572445271230-a78b5944a659"),
  },
  {
    id: 9, name: "VSPK International School", area: "Sector 13, Rohini", city: "Delhi",
    board: "CBSE", grades: "Nursery – XII", type: "Day School", gender: "Co-ed",
    rating: 0, reviews: 0, fee: 160852, facilities: ["Transport", "Library", "Computer lab"],
    photos: 7, phone: "01127550204", image: img("photo-1580582932707-520aed937b7b"),
  },
];

export const formatFee = (n: number) => "₹" + n.toLocaleString("en-IN");
