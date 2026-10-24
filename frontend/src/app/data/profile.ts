import type { FeeFreq, School } from "./schools";

// ------------------------------------------------------------------
// Sample profile content generated from the basic listing data.
// Replace getProfile() / feeSlabs() with your API response later.
// ------------------------------------------------------------------

export const rupee = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const lakh = (n: number) => `₹${(n / 100000).toFixed(2)}L`;
const r5 = (n: number) => Math.round(n / 5) * 5;

export type FeeRow = { label: string; freq: "One-time" | "Monthly" | "Annually"; amount: number; perYear: number };
export type FeeSlab = {
  cls: string; stage: string; monthly: number; annual: number;
  oneTime: number; recurring: number; rows: FeeRow[];
  /** true = components entered by the school / admin, false = auto-generated sample split */
  custom?: boolean;
};

const CLASSES = [
  { cls: "Nursery", stage: "Pre-primary", m: 1 },
  { cls: "KG", stage: "Pre-primary", m: 1 },
  ...[1, 2, 3, 4, 5].map((n) => ({ cls: `Class ${n}`, stage: "Primary", m: 1.045 })),
  ...[6, 7, 8].map((n) => ({ cls: `Class ${n}`, stage: "Middle", m: 1.09 })),
  ...[9, 10].map((n) => ({ cls: `Class ${n}`, stage: "Secondary", m: 1.15 })),
  ...[11, 12].map((n) => ({ cls: `Class ${n}`, stage: "Senior secondary", m: 1.21 })),
];

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };

function gradeIndex(raw: string): number {
  const t = raw.toLowerCase().replace(/\b(class|grade|std|standard)\b|\./g, "").replace(/\s+/g, "").trim();
  if (["nursery", "nur", "prenursery", "playgroup", "pg"].includes(t)) return 0;
  if (["kg", "lkg", "ukg", "prekg", "jrkg", "srkg"].includes(t)) return 1;
  const roman = ROMAN[t.toUpperCase()];
  if (roman) return 1 + roman;
  const n = parseInt(t, 10);
  return n >= 1 && n <= 12 ? 1 + n : -1;
}

function classRange(grades: string): [number, number] {
  const last = CLASSES.length - 1;
  const parts = (grades || "")
    .replace(/pre[\s-]+(nursery|kg)/gi, "pre$1")
    .split(/\s*(?:–|—|-|\bto\b)\s*/i)
    .filter(Boolean);
  let a = gradeIndex(parts[0] ?? "");
  let b = gradeIndex(parts[parts.length - 1] ?? "");
  if (a < 0) a = 0;
  if (b < 0) b = last;
  return a <= b ? [a, b] : [b, a];
}

export function classList(s: School) {
  const [from, to] = classRange(s.grades);
  return CLASSES.slice(from, to + 1);
}

// VSPK (id 9) uses the exact figures from the live listing
const VSPK_ANNUAL = [
  160852, 160852,
  ...Array(5).fill(168095),
  ...Array(3).fill(176500),
  ...Array(2).fill(185300),
  ...Array(2).fill(194577),
];

// slab built from the components the admin typed in for this class + session
function slabFromRows(c: { cls: string; stage: string }, rows: { label: string; freq: FeeFreq; amount: number }[]): FeeSlab {
  const mapped: FeeRow[] = rows.map((r) => ({
    label: r.label, freq: r.freq, amount: r.amount, perYear: r.freq === "Monthly" ? r.amount * 12 : r.amount,
  }));
  const annual = mapped.reduce((t, r) => t + r.perYear, 0);
  const oneTime = mapped.filter((r) => r.freq === "One-time").reduce((t, r) => t + r.perYear, 0);
  const monthlyRows = mapped.filter((r) => r.freq === "Monthly");
  const monthly = monthlyRows.length ? monthlyRows.reduce((t, r) => t + r.amount, 0) : Math.round((annual - oneTime) / 12);
  return { cls: c.cls, stage: c.stage, monthly, annual, oneTime, recurring: annual - oneTime, rows: mapped, custom: true };
}

export function feeSlabs(s: School, session: "2027-28" | "2026-27"): FeeSlab[] {
  const [from] = classRange(s.grades);
  const saved = (s.feeSlabs ?? []).filter((x) => x.session === session);
  return classList(s).map((c, i) => {
    const mine = saved.find((x) => x.cls === c.cls) ?? saved.find((x) => x.cls === "All classes");
    if (mine && mine.rows.length) return slabFromRows(c, mine.rows);
    const base = s.id === 9 ? VSPK_ANNUAL[from + i] : Math.round(s.fee * c.m);
    const target = session === "2027-28" ? base : Math.round(base * 0.94);
    const adm = r5(target * 0.0226);
    const tech = r5(target * 0.0125);
    const act = r5(target * 0.0144);
    const ac0 = r5(target * 0.0214);
    const monthly = Math.floor((target - adm - tech - act - ac0) / 12);
    const tuition = monthly * 12;
    const ac = target - tuition - adm - tech - act; // remainder keeps the total exact
    return {
      cls: c.cls, stage: c.stage, monthly, annual: target,
      oneTime: adm, recurring: target - adm,
      rows: [
        { label: "Admission fee", freq: "One-time", amount: adm, perYear: adm },
        { label: "Tuition fee", freq: "Monthly", amount: monthly, perYear: tuition },
        { label: "Annual charges", freq: "Annually", amount: ac, perYear: ac },
        { label: "Technology & e-learning fee", freq: "Annually", amount: tech, perYear: tech },
        { label: "Activity & sports fee", freq: "Annually", amount: act, perYear: act },
      ],
    };
  });
}

export function feeRange(s: School) {
  const a = feeSlabs(s, "2027-28").map((x) => x.annual).filter((n) => Number.isFinite(n) && n > 0);
  const lo = s.feeMin || (a.length ? Math.min(...a) : s.fee || 0);
  const hi = s.feeMax || (a.length ? Math.max(...a) : s.fee || 0);
  return { min: lo, max: Math.max(lo, hi) };
}

const GALLERY_IDS = [
  "photo-1580582932707-520aed937b7b", "photo-1509062522246-3755977927d7",
  "photo-1523050854058-8df90110c9f1", "photo-1562774053-701939374585",
  "photo-1564981797816-1043664bf78d", "photo-1570168007204-dfb528c6958f",
  "photo-1567157577867-8d16e90f1571", "photo-1572445271230-a78b5944a659",
];
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=80`;

export type Profile = {
  established: number; students: number; ratio: number; campus: string;
  intro: string; about: string[]; highlights: string[];
  facilities: { title: string; icon: string; items: string[] }[];
  notAvailable: string[];
  admission: { status: string; tone: "pink" | "blue"; summary: string; steps: { title: string; text: string }[]; documents: string };
  contact: { address: string; phone: string; phoneHref: string; email: string; website: string; session: string };
  faqs: { q: string; a: string }[];
  gallery: string[];
  feeUpdated: string;
  feeSource: string;
};

const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function getProfile(s: School): Profile {
  const isVspk = s.id === 9;
  const range = feeRange(s);
  const boarding = s.type !== "Day School";
  const coedWord = s.gender === "Co-ed" ? "co-educational" : s.gender === "Girls" ? "girls'" : "boys'";
  const classes = classList(s);
  
const facilitiesList: string[] = Array.isArray(s.facilities)
  ? s.facilities.filter((f): f is string => typeof f === "string")
  : [];

  const firstCls = classes[0]?.cls ?? "Nursery";
  const lastCls = classes.at(-1)?.cls ?? "Class 10";
  const o = s.profile ?? {};
  const established = o.established ?? (isVspk ? 2003 : 1994 + s.id * 3);
  const students = o.students ?? (isVspk ? 1590 : 820 + s.id * 175);
  const ratio = o.ratio ?? (isVspk ? 14 : 12 + (s.id % 6));
  const campus = o.campus || (isVspk ? "1.91 acres" : `${(1.4 + s.id * 0.45).toFixed(2)} acres`);
  const sqm = Math.round(parseFloat(campus) * 4046.86 / 100) * 100;
  const place = `${s.area}, ${s.city}`;
  const isDelhi = s.city === "Delhi";

  const intro = `${s.name} is a ${s.gender === "Co-ed" ? "co-ed" : s.gender.toLowerCase()} ${s.board} ${s.type.toLowerCase()} in ${place}, teaching ${s.grades.replace("–", "-")}. Annual fees: ${lakh(range.min)} - ${lakh(range.max)}.`;

  const aboutAuto = isVspk
    ? [
        "VSPK International School is a co-educational CBSE day school in Sector 13, Rohini, North West Delhi, teaching from Nursery to Class 12. The school aims to develop all-round children who can become tomorrow's leaders in the field they choose.",
        "It believes every child is unique, and works to support each child's social, emotional, physical and intellectual growth in a safe, clean and green campus. Its mission also stresses respect for India's diverse traditions, strong ethics and honesty, teamwork and leadership, and sensitivity towards the less fortunate.",
        "Students take part in sports, arts, clubs and community activities alongside academics, with regular parent-teacher interaction and counselling support through the year.",
      ]
    : [
        `${s.name} is a ${coedWord} ${s.board} ${s.type.toLowerCase()} in ${s.area}, ${s.city}, teaching from ${firstCls} to ${lastCls}. The school focuses on strong academics, character building and all-round development in a safe and supportive campus.`,
        `Classrooms are designed for active learning, with a balance of academics, sports, arts and technology. Teachers work closely with parents through regular feedback, and the school offers counselling support at every stage.`,
        `Parents choose ${s.name} for its ${s.board} curriculum, ${boarding ? "residential and day options" : "convenient day-school routine"}, and facilities such as ${(facilitiesList.slice(0, 3).join(", ") || "school facilities").toLowerCase()}.`,
      ];

  const highlightsAuto = [
    `${s.board} curriculum, ${firstCls} to ${lastCls}`,
    `Student-teacher ratio of ${ratio}:1`,
    "Smart, air-conditioned classrooms with Wi-Fi",
    "Transport with GPS bus tracking",
    "Sibling criteria considered in admission",
    "Accessible campus: ramps, washrooms, elevators",
    `Large campus of about ${sqm.toLocaleString("en-IN")} sq. m.`,
    "Medium of instruction: English (Hindi taught)",
  ];

  const facilities = [
    { title: "Classrooms & learning", icon: "📚", items: ["Smart classes", "Wi-Fi", "AC classrooms", "Library / reading room", "Computer lab", "Science lab", "Auditorium / media room"] },
    { title: "Sports & fitness", icon: "🏅", items: ["Indoor sports", "Outdoor sports", "Playground", "Yoga", "Skating", "Gym", "Taekwondo", "Cricket academy"] },
    { title: "Programmes & clubs", icon: "🔬", items: ["Atal Tinkering Lab", "Abacus and Vedic Maths", "Astronomy club", "Literary club", "Science club", "Performing arts club", "Music programme"] },
    { title: "Activities", icon: "🎨", items: ["Art and craft", "Dance", "Music", "Debate", "Drama", "Gardening", "Picnics and excursions"] },
    {
      title: "Safety & services", icon: "🛡️",
      items: ["CCTV", "GPS bus tracking app", "Student tracking app", "Medical room", "Transportation", "Meals", ...(boarding ? ["Hostel"] : []), "Alumni association"],
    },
    { title: "Accessibility", icon: "♿", items: ["Ramps", "Accessible washrooms", "Elevators"] },
  ];
  const notAvailable = ["Cafeteria / canteen", "day care", ...(boarding ? [] : ["hostel"]), "swimming pool", "robotics lab"];

  const admissionAuto = isDelhi
    ? {
        status: "Dates not announced yet", tone: "pink" as const,
        summary: `Nursery, KG and Class 1 admissions follow the Delhi Directorate of Education (DoE) schedule. Dates for 2027-28 have not been announced yet. Send an enquiry and we will help you track the dates.`,
        steps: [
          { title: "Check the admission schedule", text: "Nursery, KG and Class 1 admissions follow the Delhi Directorate of Education (DoE) schedule. Dates for 2027-28 are not announced yet." },
          { title: "Fill the application", text: "Apply through the school or its application partner. Application fee is listed as ₹0." },
          { title: "Points-based selection", text: "Children are selected on the DoE points system, which includes criteria such as sibling and alumni." },
          { title: "First list and waiting list", text: "The school displays the first list of selected children along with the waiting list and points." },
          { title: "Second list and confirmation", text: "If seats remain, a second list is displayed. Selected parents then complete the formalities and fee payment." },
        ],
        documents: "Documents commonly asked: child's birth certificate, address proof and photo; parent/guardian photo; sibling or alumni proof (if applicable); religion proof for minority category (optional); Aadhaar of child and parent (optional).",
      }
    : {
        status: "Enquiries open", tone: "blue" as const,
        summary: `Admissions for the 2027-28 session are handled directly by ${s.name}. Send an enquiry and we will help you with the admission calendar, seat availability and entrance-test dates.`,
        steps: [
          { title: "Send an enquiry", text: "Share your child's class and contact details. The admissions office will send the prospectus and the current admission calendar." },
          { title: "Visit the campus", text: "Book a campus visit to see the classrooms and facilities and to meet the admissions team." },
          { title: "Fill the application", text: "Submit the application form online or at the school office along with the registration fee, if applicable." },
          { title: "Interaction or assessment", text: "Younger children usually have an informal interaction. Older classes may have a short written assessment." },
          { title: "Offer and fee payment", text: "Selected parents receive an offer, submit the documents and pay the admission fee to confirm the seat." },
        ],
        documents: "Documents commonly asked: child's birth certificate, address proof and photographs; parent/guardian ID proof; previous school report card and transfer certificate (for Class 2 onwards); sibling or alumni proof (if applicable).",
      };

  const contactAuto = isVspk
    ? {
        address: "Rajapur, Pocket 1/1, Sector 13, Rohini, North West Delhi, Delhi - 110085",
        phone: "011-27550204 / 27550205", phoneHref: "01127550204",
        email: "vspkschool@yahoo.co.in", website: "www.vspkinternational.edu.in", session: "April to March",
      }
    : {
        address: `${s.area}, ${s.city}`,
        phone: s.phone.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2"), phoneHref: s.phone,
        email: `admissions@${slug(s.name)}.example`, website: `www.${slug(s.name)}.example`, session: "April to March",
      };

  const faqsAuto = [
    { q: `What is the fee structure of ${s.name}?`, a: `For 2027-28 the annual fee at ${s.name} ranges from ${lakh(range.min)} (${firstCls}) to ${lakh(range.max)} (${lastCls}). Check the Fees section above for the class-wise breakdown, and confirm the final fee letter with the school.` },
    { q: `Which board does ${s.name} follow?`, a: `${s.name} follows the ${s.board} board and teaches from ${firstCls} to ${lastCls}.` },
    { q: `Is ${s.name} a day school or a boarding school?`, a: `${s.name} is a ${s.type.toLowerCase()}. ${boarding ? "Hostel facilities are available on campus." : "Hostel facilities are not available."}` },
    { q: `How can I apply for admission to ${s.name} for 2027-28?`, a: `Send an enquiry using the form on this page or call the school. ${isDelhi ? "Nursery, KG and Class 1 admissions follow the Delhi DoE schedule." : "The admissions office will share the application process and key dates."}` },
    { q: `What is the student-teacher ratio at ${s.name}?`, a: `The student-teacher ratio is about ${ratio}:1, with around ${students.toLocaleString("en-IN")} students on roll.` },
    { q: `What facilities does ${s.name} offer?`, a: `Facilities include smart classrooms, library, computer and science labs, sports and activity spaces, CCTV and GPS-tracked transport. See the Facilities section for the full list.` },
    { q: `Does ${s.name} provide school transport?`, a: `Yes, transport is available with GPS bus tracking. Routes and timings depend on your locality, so confirm with the school.` },
    { q: `What documents are needed for admission to ${s.name}?`, a: admissionAuto.documents.replace("Documents commonly asked: ", "Commonly asked documents include ") },
  ];

  // ---- anything the admin typed in /admin wins over the generated text ----
  const about = s.about?.trim() ? s.about.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean) : aboutAuto;
  const highlights = s.highlights?.length ? s.highlights : highlightsAuto;
  const faqs = s.faqs?.length ? s.faqs : faqsAuto;
  const admission = {
    ...admissionAuto,
    status: o.admissionStatus || admissionAuto.status,
    tone: o.admissionStatus ? ((/not|closed|soon/i.test(o.admissionStatus) ? "pink" : "blue") as "pink" | "blue") : admissionAuto.tone,
    summary: o.admissionSummary || admissionAuto.summary,
    documents: o.documents || admissionAuto.documents,
  };
  const contact = {
    ...contactAuto,
    address: o.address || contactAuto.address,
    email: o.email || contactAuto.email,
    website: o.website || contactAuto.website,
  };

  const others = GALLERY_IDS.map(photo).filter((u) => u !== s.image);
  const gallery = s.gallery?.length
    ? Array.from(new Set([s.image, ...s.gallery]))
    : [s.image, ...others].slice(0, Math.max(7, 1));

  return {
    established, students, ratio, campus, intro, about, highlights, facilities, notAvailable,
    admission, contact, faqs, gallery,
    feeUpdated: s.feeUpdated || "Nov 2025",
    feeSource: s.feeNote || `Source: Public listing, updated Nov 2025. Fees are indicative and may change each academic year. Figures for different sessions come from different public listings, so they may not be directly comparable. The total admission cost for 2027-28 is listed as roughly ${rupee(range.min * 1.08)} to ${rupee(range.max * 1.066)} including registration, tuition, admission, annual, development and other fees. Please confirm the latest fees with the school.`,
  };
}

export function similarSchools(s: School, schools: School[], limit = 6) {
  const same = schools.filter((x) => x.id !== s.id && x.city === s.city);
  const rest = schools.filter((x) => x.id !== s.id && x.city !== s.city);
  return { list: [...same, ...rest].slice(0, limit), sameCity: same.length >= 3 };
}
