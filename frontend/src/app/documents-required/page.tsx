import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Icon from "../components/Icon";

export const metadata: Metadata = {
  title: "Documents Required for School Admission in India (2026-27 Checklist) | VidyaVista",
  description:
    "Complete checklist of documents required for Nursery, KG, Primary, and High School admissions across CBSE, ICSE, IB and State Boards in India.",
  alternates: { canonical: "/documents-required" },
};

const docGroups = [
  {
    category: "Essential Documents for All Classes (Nursery to 12)",
    docs: [
      { name: "Birth Certificate", note: "Issued by Municipal Corporation / Gram Panchayat. Mandatory proof of date of birth." },
      { name: "Recent Passport-size Photographs", note: "Usually 4-6 photographs of the child, and 2-4 joint photographs with parents." },
      { name: "Proof of Residence / Address", note: "Aadhaar card of parents, utility bills (electricity/water), passport, or registered rent agreement." },
      { name: "Aadhaar Card of Child & Parents", note: "Mandated by state education portals for enrollment tracking." },
      { name: "Immunization / Medical Record", note: "Pediatrician-certified vaccination chart, blood group report, and any allergy/chronic health notices." },
    ],
  },
  {
    category: "Additional Documents for Transfer / Class 1 onwards",
    docs: [
      { name: "Original Transfer Certificate (TC)", note: "Must be countersigned by the District Education Officer (DEO) or CBSE/ICSE regional office if migrating from another state or board." },
      { name: "Previous Academic Report Card / Marksheet", note: "Certified report cards of the past two academic sessions." },
      { name: "Character / Conduct Certificate", note: "Issued by previous school principal for Class 9 and 11 admissions." },
      { name: "Migration Certificate", note: "Required strictly for Class 11-12 students shifting from state boards to CBSE/ICSE or vice-versa." },
    ],
  },
  {
    category: "Special Category Certificates (If Applicable)",
    docs: [
      { name: "Category Certificate (SC / ST / OBC)", note: "Issued by designated revenue authority in the name of the child or father." },
      { name: "EWS / BPL Income Certificate", note: "Required for RTE 25% quota applications, issued by Tehsildar / Sub-Divisional Magistrate." },
      { name: "Alumni / Sibling Proof", note: "Fee receipts or alumni card copy for schools awarding sibling or alumni points." },
      { name: "Single Parent / Legal Guardianship Decree", note: "Court adoption papers or custody order copy where applicable." },
    ],
  },
];

export default function DocumentsRequiredPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-[#EEF4FA] to-white py-12 sm:py-16 border-b border-[#D6DDE5]/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#E1F1FA] border border-[#BDE0F5] px-3.5 py-1 text-xs font-bold text-[#0A5C91]">
            <Icon name="check" className="h-4 w-4" />
            <span>Checklist & Verification</span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black text-[#0B2A47] tracking-tight leading-[1.1]">
            Documents Required for School Admission (2026–27)
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-[#4E5A68] leading-relaxed">
            Keep these original documents and self-attested copies ready to ensure a smooth, hassle-free school admission process.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 space-y-12">
          {docGroups.map((grp, idx) => (
            <div key={idx} className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0B2A47] border-l-4 border-[#EC0E58] pl-3">
                {grp.category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {grp.docs.map((d, i) => (
                  <div key={i} className="rounded-2xl border border-[#D6DDE5] bg-white p-5 shadow-sm hover:border-[#0795DC] transition">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E1F1FA] text-[#0A5C91] font-bold text-sm">
                        📄
                      </span>
                      <div>
                        <h3 className="font-bold text-[#0B2A47] text-base">{d.name}</h3>
                        <p className="mt-1 text-xs sm:text-sm text-[#4E5A68] leading-relaxed">{d.note}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-2xl bg-[#EEF4FA] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-[#D6DDE5]">
            <div>
              <h3 className="text-lg font-bold text-[#0B2A47]">Ready to apply to top schools?</h3>
              <p className="text-sm text-[#626F7D] mt-1">Explore 4,600+ verified school profiles with detailed admission criteria.</p>
            </div>
            <Link
              href="/schools"
              className="shrink-0 rounded-xl bg-[#0795DC] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
            >
              Search Schools &rarr;
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
