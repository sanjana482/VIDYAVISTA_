import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Icon from "../components/Icon";

export const metadata: Metadata = {
  title: "About Us | VidyaVista - India's School Discovery Platform",
  description:
    "Learn about VidyaVista's mission to empower parents with transparent fee structures, authentic reviews, and comprehensive school information across India.",
  alternates: { canonical: "/about" },
};

const stats = [
  { value: "4,600+", label: "Verified Schools Listed" },
  { value: "28+", label: "States & Union Territories" },
  { value: "100%", label: "Parent-First & Transparent" },
  { value: "Free", label: "School Discovery & Comparison" },
];

const pillars = [
  {
    icon: "scale",
    title: "Fee Transparency",
    desc: "No hidden charges or surprise costs. We help families view and compare actual annual budgets, tuition fees, and caution deposits.",
  },
  {
    icon: "message",
    title: "Authentic Parent Reviews",
    desc: "Unbiased feedback from verified parents and guardians covering academics, safety, teacher dedication, and campus culture.",
  },
  {
    icon: "sparkle",
    title: "Side-by-Side Comparison",
    desc: "Compare boards (CBSE, ICSE, IB, Cambridge), student-teacher ratios, transport amenities, and sports facilities side by side.",
  },
  {
    icon: "phone",
    title: "Dedicated Counselling",
    desc: "Our friendly academic counsellors guide families through admission deadlines, eligibility criteria, and campus selection.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-[#EEF4FA] to-white py-14 sm:py-20 border-b border-[#D6DDE5]/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E1F1FA] border border-[#BDE0F5] px-4 py-1.5 text-xs font-bold text-[#0A5C91]">
            <span>About VidyaVista</span>
          </div>
          <h1 className="mt-5 text-3xl sm:text-5xl font-black text-[#0B2A47] tracking-tight leading-[1.1] max-w-3xl mx-auto">
            Empowering Every Family to Find the Perfect School
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#4E5A68] leading-relaxed mx-auto">
            Choosing a school is one of the most critical decisions in your child&apos;s life. VidyaVista was created to simplify this journey with verified data, genuine community reviews, and transparent fee comparisons.
          </p>

          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/schools"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0795DC] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
            >
              <span>Explore Schools</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b border-[#EEF4FA]">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <div key={i} className="p-4 rounded-2xl bg-[#F8FBFE] border border-[#E1E7EE]">
                <p className="text-3xl sm:text-4xl font-black text-[#0795DC]">{s.value}</p>
                <p className="mt-1 text-xs sm:text-sm font-bold text-[#4E5A68]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2A47]">Why Parents Trust VidyaVista</h2>
            <p className="mt-2 text-sm sm:text-base text-[#626F7D]">Built by educators and technology leaders committed to transparency in Indian school education.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p, i) => (
              <div key={i} className="rounded-2xl border border-[#D6DDE5] bg-white p-6 shadow-sm hover:border-[#0795DC] transition">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E1F1FA] text-[#0A5C91] mb-4">
                  <Icon name={p.icon} className="h-6 w-6" />
                </span>
                <h3 className="font-bold text-[#0B2A47] text-lg">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4E5A68]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
