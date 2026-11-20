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
    return (
      <main className="min-h-screen bg-white">
        <Navbar />
        {children ? (
          children
        ) : (
          <section className="bg-gradient-to-b from-[#EEF4FA] to-white py-16 text-center">
            <h1 className="text-3xl font-black text-[#0B2A47]">Loading Content...</h1>
          </section>
        )}
        <Footer />
      </main>
    );
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

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/schools"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0795DC] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0A5C91] transition"
            >
              <span>Explore All Schools</span>
              <span>&rarr;</span>
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 rounded-xl border border-[#D6DDE5] bg-white px-5 py-3 text-sm font-bold text-[#0B2A47] hover:border-[#0795DC] transition"
            >
              <span>Compare Schools</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      {page.sections && page.sections.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {page.sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#E1E7EE] bg-white p-6 sm:p-8 shadow-sm hover:border-[#0795DC]/40 transition"
                >
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E1F1FA] text-xs font-bold text-[#0A5C91] mb-3">
                    0{idx + 1}
                  </div>
                  <h3 className="text-xl font-bold text-[#0B2A47]">
                    {sec.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4E5A68]">
                    {sec.body}
                  </p>
                  {sec.points && sec.points.length > 0 && (
                    <ul className="mt-4 space-y-2 border-t border-[#F1F5F9] pt-4">
                      {sec.points.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 text-xs sm:text-sm text-[#4E5A68]">
                          <span className="text-[#0795DC] mt-0.5 font-bold">&#10003;</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs Section */}
      {page.faqs && page.faqs.length > 0 && (
        <section className="py-12 bg-[#F8FBFE] border-t border-[#E1E7EE]">
          <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2A47]">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-4">
              {page.faqs.map((faq, fIdx) => (
                <div
                  key={fIdx}
                  className="rounded-xl border border-[#D6DDE5] bg-white p-5 shadow-sm"
                >
                  <h4 className="font-bold text-[#0B2A47] text-base">
                    {faq.q}
                  </h4>
                  <p className="mt-2 text-sm text-[#4E5A68] leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {children}

      <Footer />
    </main>
  );
}
