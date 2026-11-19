import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Icon from "../components/Icon";

export const metadata: Metadata = {
  title: "School Admission Guide 2026-27 | VidyaVista",
  description:
    "Comprehensive step-by-step roadmap for nursery, primary, and secondary school admissions in India. Understand age criteria, timelines, and entrance procedures.",
  alternates: { canonical: "/admission-guide" },
};

const stages = [
  {
    step: "01",
    title: "Define Criteria & Budget",
    desc: "Decide on preferred curriculum (CBSE/ICSE/IB), maximum commute radius (typically under 45 mins), day vs boarding school, and annual fee budget.",
  },
  {
    step: "02",
    title: "Research & Shortlist Schools",
    desc: "Use VidyaVista to compare top schools, inspect infrastructure (labs, sports, security), and check genuine parent reviews.",
  },
  {
    step: "03",
    title: "Review Age Eligibility & Form Deadlines",
    desc: "Ensure your child meets the NEP 2020 age mandate (6+ years for Class 1, 3+ for Nursery as of March 31/July 31 depending on state regulations).",
  },
  {
    step: "04",
    title: "Document Preparation",
    desc: "Keep birth certificate, immunization card, residence proof, passport size photographs, and previous academic transcripts ready.",
  },
  {
    step: "05",
    title: "Interaction & Campus Visit",
    desc: "Attend school open houses, meet the principal, observe classroom teacher-student ratios, and prepare for informal parent-child interaction sessions.",
  },
  {
    step: "06",
    title: "Fee Payment & Seat Confirmation",
    desc: "Upon receiving the offer letter, verify fee breakdown (tuition, transport, caution deposit) and complete formalities before the deadline.",
  },
];

export default function AdmissionGuidePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-[#EEF4FA] to-white py-12 sm:py-16 border-b border-[#D6DDE5]/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E1F1FA] border border-[#BDE0F5] px-3.5 py-1 text-xs font-bold text-[#0A5C91]">
            <Icon name="school" className="h-4 w-4" />
            <span>Admission Advisory</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black text-[#0B2A47] tracking-tight leading-[1.1]">
            School Admission Guide (2026–27)
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#4E5A68] leading-relaxed">
            A comprehensive, parent-first roadmap navigating the entire school admission journey — from shortlisting and paperwork to interactions and confirmations.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/schools"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0795DC] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
            >
              <span>Explore Schools Now</span>
              <span>&rarr;</span>
            </Link>
            <Link
              href="/documents-required"
              className="inline-flex items-center gap-2 rounded-xl border border-[#D6DDE5] bg-white px-5 py-3 text-sm font-bold text-[#0B2A47] hover:border-[#0795DC] hover:text-[#0795DC] transition"
            >
              <span>View Documents Checklist &rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 space-y-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2A47] border-l-4 border-[#EC0E58] pl-4">
            Step-by-Step Admission Roadmap
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stages.map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-[#D6DDE5] bg-white p-6 shadow-sm hover:border-[#0795DC] hover:shadow-md transition"
              >
                <span className="text-3xl font-black text-[#0795DC]/20">{s.step}</span>
                <h3 className="mt-2 text-lg font-bold text-[#0B2A47]">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4E5A68]">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#BDE0F5] bg-[#E1F1FA]/60 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-[#0A5C91]">Need personalised guidance from education counsellors?</h3>
              <p className="mt-1 text-sm text-[#4E5A68]">
                Get 1-on-1 advice tailored to your location, board preference, and admission timeline.
              </p>
            </div>
            <Link
              href="/compare"
              className="shrink-0 rounded-xl bg-[#0B2A47] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0795DC] transition"
            >
              Compare Schools &rarr;
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
