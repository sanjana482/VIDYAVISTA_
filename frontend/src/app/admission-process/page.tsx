import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Icon from "../components/Icon";

export const metadata: Metadata = {
  title: "School Admission Process: Stages, Tests & Interactions | VidyaVista",
  description:
    "Understand the complete school admission process in India: registration timelines, entry evaluations, parent interactions, merit lists, and enrollment formalities.",
  alternates: { canonical: "/admission-process" },
};

const phases = [
  {
    phase: "Phase 1: Notification & Registration",
    months: "August - November (for subsequent academic year)",
    items: [
      "School releases admission notification, seats breakdown, and eligibility guidelines online.",
      "Parents purchase or fill out online registration forms on the school website.",
      "Submission of preliminary child and parent details along with application fee payment.",
    ],
  },
  {
    phase: "Phase 2: Interaction / Assessment Round",
    months: "November - January",
    items: [
      "Early years (Nursery to KG): Informal child observation and friendly parent interaction.",
      "Primary & Middle School (Class 1 to 8): Basic literacy and numeracy readiness check.",
      "Secondary & Senior Secondary (Class 9 & 11): Written diagnostic test in English, Math, and Science.",
    ],
  },
  {
    phase: "Phase 3: Merit List & Offer Letter",
    months: "December - February",
    items: [
      "School publishes first and subsequent admission lists (lottery system for pre-primary in certain cities).",
      "Selected candidates receive an official provisional admission letter with fee payment deadlines.",
    ],
  },
  {
    phase: "Phase 4: Document Verification & Enrollment",
    months: "January - March",
    items: [
      "Submission of original Transfer Certificate (TC) and certified birth certificate copy.",
      "First quarter fee payment and issuance of student ID, uniform, and book kit schedule.",
      "Orientation session for new parents and students prior to academic session commencement in April/June.",
    ],
  },
];

export default function AdmissionProcessPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-[#EEF4FA] to-white py-12 sm:py-16 border-b border-[#D6DDE5]/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E1F1FA] border border-[#BDE0F5] px-3.5 py-1 text-xs font-bold text-[#0A5C91]">
            <Icon name="check" className="h-4 w-4" />
            <span>Process & Timelines</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black text-[#0B2A47] tracking-tight leading-[1.1]">
            The School Admission Process Explained
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#4E5A68] leading-relaxed">
            A clear timeline breakdown of what happens at every stage of school applications — registration, screening, interactions, and final enrollment.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="space-y-8">
            {phases.map((p, idx) => (
              <div key={idx} className="rounded-2xl border border-[#D6DDE5] bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF4FA] pb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#0B2A47]">{p.phase}</h2>
                  <span className="rounded-full bg-[#E1F1FA] px-3.5 py-1 text-xs font-extrabold text-[#0A5C91]">
                    {p.months}
                  </span>
                </div>
                <ul className="mt-5 space-y-3">
                  {p.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-[#4E5A68]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 mt-0.5">
                        ✓
                      </span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/documents-required"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0795DC] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
            >
              <span>See Documents Checklist</span>
              <span>&rarr;</span>
            </Link>
            <Link
              href="/schools"
              className="inline-flex items-center gap-2 rounded-xl border border-[#D6DDE5] bg-white px-6 py-3 text-sm font-bold text-[#0B2A47] hover:border-[#0795DC] transition"
            >
              <span>Browse Schools Now</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
