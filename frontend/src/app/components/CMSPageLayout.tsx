import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import type { CMSPageData } from "../lib/cmsApi";

export default function CMSPageLayout({
  page,
  defaultBadge = "Admission Resource",
  children,
}: {
  page: CMSPageData | null;
  defaultBadge?: string;
  children?: React.ReactNode;
}) {
  if (!page) {
    return <>{children}</>;
  }

  const updatedDate = page.updated_at
    ? new Date(page.updated_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-[#EEF4FA] to-white py-12 sm:py-16 border-b border-[#D6DDE5]/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#E1F1FA] border border-[#BDE0F5] px-3.5 py-1 text-xs font-bold text-[#0A5C91]">
              <span>{defaultBadge}</span>
            </div>
            {updatedDate && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Updated at: {updatedDate}
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B2A47] tracking-tight leading-[1.15] max-w-4xl">
            {page.title}
          </h1>

          {page.subtitle && (
            <p className="mt-3 max-w-3xl text-base sm:text-lg text-[#4E5A68] leading-relaxed">
              {page.subtitle}
            </p>
          )}

          {page.content_html && (
            <div
              className="mt-6 max-w-3xl text-base text-[#4E5A68] leading-relaxed prose prose-slate"
              dangerouslySetInnerHTML={{ __html: page.content_html }}
            />
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/schools"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0795DC] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
            >
              <span>Explore Schools</span>
              <span>&rarr;</span>
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-5 py-3 text-sm font-bold text-[#0B2A47] hover:bg-slate-50 transition"
            >
              <span>Compare Schools</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Structured Sections */}
      {page.sections && page.sections.length > 0 && (
        <section className="py-12 border-b border-[#EEF4FA]">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 space-y-6">
            {page.sections.map((sec, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white p-6 sm:p-8 border border-[#E1E7EE] shadow-sm hover:border-[#0795DC]/40 transition"
              >
                <h2 className="text-xl sm:text-2xl font-bold text-[#0B2A47]">
                  {sec.title}
                </h2>
                {sec.body && (
                  <p className="mt-3 text-sm sm:text-base text-[#4E5A68] leading-relaxed whitespace-pre-line">
                    {sec.body}
                  </p>
                )}
                {sec.points && sec.points.length > 0 && (
                  <ul className="mt-4 space-y-2.5">
                    {sec.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 text-sm sm:text-base text-[#2C3847]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0795DC]"></span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Children or Extra Custom Blocks */}
      {children}

      {/* FAQs */}
      {page.faqs && page.faqs.length > 0 && (
        <section className="py-14 bg-[#F8FBFE] border-t border-[#E1E7EE]">
          <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B2A47] text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {page.faqs.map((faq, fIdx) => (
                <div key={fIdx} className="rounded-xl bg-white p-6 border border-[#E1E7EE] shadow-xs">
                  <h3 className="text-base sm:text-lg font-bold text-[#0B2A47]">{faq.q}</h3>
                  <p className="mt-2 text-sm sm:text-base text-[#4E5A68] leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
