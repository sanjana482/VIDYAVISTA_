import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Icon from "../components/Icon";

export const metadata: Metadata = {
  title: "School Fees Guide: Understanding Fee Structures & Hidden Costs | VidyaVista",
  description:
    "A comprehensive guide for parents to understand school fee breakdowns in India: tuition fees, admission charges, caution deposits, transport, and how to plan education budgets effectively.",
  alternates: { canonical: "/school-fees-guide" },
};

const feeComponents = [
  {
    title: "1. Tuition Fee",
    badge: "Recurring (Monthly/Quarterly)",
    desc: "The primary charge covering academic instruction, curriculum delivery, and teacher salaries. Usually payable quarterly or term-wise.",
  },
  {
    title: "2. Admission & Registration Fee",
    badge: "One-time",
    desc: "Charged at the time of accepting admission. Most state fee regulatory committees mandate reasonable caps on non-refundable admission fees.",
  },
  {
    title: "3. Caution Money / Security Deposit",
    badge: "Refundable",
    desc: "A refundable deposit held by the school against damage or unpaid dues. Always request an official receipt and retain it until your child graduates or transfers.",
  },
  {
    title: "4. Annual & Development Charges",
    badge: "Annual",
    desc: "Covers campus infrastructure maintenance, smart classroom tech licenses, science labs, library access, and sports ground upkeep.",
  },
  {
    title: "5. Transport & Bus Fees",
    badge: "Distance-based (Quarterly)",
    desc: "Calculated based on distance slabs or pickup routes. Verify if GPS tracking, bus attendants, and emergency first aid are included.",
  },
  {
    title: "6. Activity, Lab & Uniform/Books",
    badge: "Variable",
    desc: "Expenses for robotics, swimming, performing arts, uniforms, books, and educational excursions. Ask for itemised lists beforehand.",
  },
];

const checklist = [
  "Is the admission fee strictly one-time, or charged annually?",
  "Under what circumstances is the caution deposit refunded, and within what timeframe?",
  "What is the historical fee hike percentage over the last 3 years (typically 5-10%)?",
  "Are extracurriculars (robotics, sports coaching, music) included or billed separately?",
  "What is the penalty or grace period for delayed quarterly payments?",
  "Are there sibling discounts or full-year payment concessions?",
];

export default function SchoolFeesGuidePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-b from-[#EEF4FA] to-white py-12 sm:py-16 border-b border-[#D6DDE5]/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E1F1FA] border border-[#BDE0F5] px-3.5 py-1 text-xs font-bold text-[#0A5C91]">
            <Icon name="scale" className="h-4 w-4" />
            <span>Transparency & Finance</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black text-[#0B2A47] tracking-tight leading-[1.1]">
            Understanding School Fee Structures in India
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#4E5A68] leading-relaxed">
            Everything parents need to know about tuition fees, caution deposits, transport slabs, and hidden costs before finalising admissions.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/schools"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0795DC] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
            >
              <span>Compare School Fees Across India</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Fee Components */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2A47] border-l-4 border-[#EC0E58] pl-4">
              Common Components of a School Fee Structure
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#626F7D] max-w-3xl">
              School fee quotes can sometimes appear complicated. Here is a clear breakdown of what each line item represents in modern day and boarding schools.
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {feeComponents.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#D6DDE5] bg-white p-6 shadow-sm hover:border-[#0795DC] hover:shadow-md transition"
                >
                  <span className="inline-block rounded-full bg-[#EEF4FA] px-3 py-1 text-xs font-extrabold text-[#0A5C91]">
                    {item.badge}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-[#0B2A47]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4E5A68]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="rounded-3xl bg-[#0B2A47] p-8 sm:p-10 text-white">
            <h2 className="text-2xl sm:text-3xl font-black">Fee Transparency Checklist for Parents</h2>
            <p className="mt-2 text-sm sm:text-base text-[#CDD4DD]">
              Ask these essential questions during your school tour or admission discussion:
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {checklist.map((q, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-2xl bg-white/[0.08] p-4 border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF6B9A] text-xs font-black text-[#0B2A47]">
                    ✓
                  </span>
                  <span className="text-sm font-medium text-white/95 leading-snug">{q}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="rounded-2xl border border-[#BDE0F5] bg-[#E1F1FA]/60 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-[#0A5C91]">Need help finding schools within your budget?</h3>
              <p className="mt-1 text-sm text-[#4E5A68]">
                VidyaVista lists verified fee ranges for 4,600+ schools across CBSE, ICSE, IB, and State Boards.
              </p>
            </div>
            <Link
              href="/schools"
              className="shrink-0 rounded-xl bg-[#0795DC] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
            >
              Filter by Fee Range &rarr;
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
