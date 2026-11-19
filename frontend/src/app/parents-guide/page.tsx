import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ParentGuide from "../components/ParentGuide";
import Link from "next/link";
import Icon from "../components/Icon";

export const metadata: Metadata = {
  title: "Parent's Complete Guide to School Selection | VidyaVista",
  description:
    "Comprehensive guide for Indian parents on choosing the best board (CBSE, ICSE, IB, Cambridge, State Board), day vs boarding schools, campus visit checklists and shortlisting tips.",
  alternates: { canonical: "/parents-guide" },
};

export default function ParentsGuidePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-[#EEF4FA] to-white py-12 sm:py-16 border-b border-[#D6DDE5]/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E1F1FA] border border-[#BDE0F5] px-3.5 py-1 text-xs font-bold text-[#0A5C91]">
            <Icon name="compass" className="h-4 w-4" />
            <span>Parent Resource Center</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black text-[#0B2A47] tracking-tight leading-[1.1]">
            Parent&apos;s Comprehensive Guide to Choosing the Right School
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#4E5A68] leading-relaxed">
            From evaluating boards and curricula to comparing fees and inspecting campus facilities — practical advice to help you make the best decision for your child.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/schools"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0795DC] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
            >
              <span>Explore 4,600+ Schools</span>
              <span>&rarr;</span>
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 rounded-xl border border-[#D6DDE5] bg-white px-5 py-3 text-sm font-bold text-[#0B2A47] hover:border-[#0795DC] hover:text-[#0795DC] transition"
            >
              <Icon name="scale" className="h-4 w-4" />
              <span>Compare Schools Side by Side</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Guide Component */}
      <ParentGuide />

      <Footer />
    </main>
  );
}
