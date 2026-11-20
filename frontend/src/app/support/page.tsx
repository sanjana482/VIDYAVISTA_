import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Icon from "../components/Icon";

export const metadata: Metadata = {
  title: "Help & Support | VidyaVista",
  description:
    "Find answers and assistance for using VidyaVista: search schools, compare fee structures, claim school profiles, or connect with our support desk.",
  alternates: { canonical: "/support" },
};

const supportTopics = [
  {
    title: "For Parents & Guardians",
    desc: "Get help finding schools, filtering by fee and board, scheduling campus visits, and requesting free expert counselling.",
    links: [
      { label: "How to compare schools side by side", href: "/compare" },
      { label: "School Admission Roadmap & Criteria", href: "/admission-guide" },
      { label: "Documents checklist for admissions", href: "/documents-required" },
      { label: "Understanding tuition and transport fees", href: "/school-fees-guide" },
    ],
  },
  {
    title: "For School Administrators",
    desc: "Manage your institution listing, update facilities and photos, respond to parent enquiries, and access verified admission leads.",
    links: [
      { label: "Claim or Register your school profile", href: "/login?role=school&mode=register" },
      { label: "School Administration Login", href: "/login?role=school&mode=login" },
      { label: "Contact institutional partnerships team", href: "/contact" },
    ],
  },
  {
    title: "General Inquiries & FAQs",
    desc: "Answers to common questions regarding reviews, verification badges, data privacy, and technical queries.",
    links: [
      { label: "Browse Frequently Asked Questions", href: "/faqs" },
      { label: "Read Parent's Selection Guide", href: "/parents-guide" },
      { label: "Contact customer care desk", href: "/contact" },
    ],
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-[#EEF4FA] to-white py-12 sm:py-16 border-b border-[#D6DDE5]/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E1F1FA] border border-[#BDE0F5] px-3.5 py-1 text-xs font-bold text-[#0A5C91]">
            <Icon name="check" className="h-4 w-4" />
            <span>Help Desk &amp; Knowledge Base</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black text-[#0B2A47] tracking-tight leading-[1.1]">
            How Can We Help You Today?
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#4E5A68] leading-relaxed">
            Browse guides, get technical support, or connect with our academic assistance team.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid gap-8 md:grid-cols-3">
            {supportTopics.map((topic, idx) => (
              <div key={idx} className="rounded-2xl border border-[#D6DDE5] bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#0B2A47]">{topic.title}</h2>
                  <p className="mt-2 text-sm text-[#626F7D] leading-relaxed">{topic.desc}</p>
                  <div className="mt-5 space-y-2.5">
                    {topic.links.map((lnk, i) => (
                      <Link
                        key={i}
                        href={lnk.href}
                        className="flex items-center justify-between rounded-xl bg-[#F8FBFE] p-3 text-xs sm:text-sm font-semibold text-[#0A5C91] hover:bg-[#EEF4FA] transition border border-[#E1E7EE]"
                      >
                        <span>{lnk.label}</span>
                        <span>&rarr;</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-[#0B2A47] p-8 sm:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold">Still need personal assistance?</h3>
              <p className="mt-1 text-sm text-[#CDD4DD]">
                Our support team is available Monday to Saturday to answer queries and guide your school search.
              </p>
            </div>
            <Link
              href="/contact"
              className="shrink-0 rounded-xl bg-[#0795DC] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
            >
              Contact Support Team &rarr;
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
