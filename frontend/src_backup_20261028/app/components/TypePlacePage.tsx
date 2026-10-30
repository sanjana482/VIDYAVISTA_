// /day-schools/pune, /boarding-schools/maharashtra, /play-schools/mumbai
// One shared server page. Google sees: title, heading, description, highlights, school names, reviews, FAQs.
// Visitors get the interactive filter list on the same URL (filters change in place, no new page).
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SchoolListing from "./SchoolListing";
import RelatedLinks from "./RelatedLinks";
import SchoolsHero from "./SchoolsHero";
import LocationReviews, { reviewSummary } from "./LocationReviews";
import FaqList from "./profile/FaqList";
import Icon from "./Icon";
import ClampedText from "./ClampedText";
import { BOARD_LABEL, formatFee, stateFor, type School } from "../data/schools";
import { fetchAllSchools } from "../lib/schoolsApi";
import { fetchLocationContent } from "../lib/locationsApi";
import { resolvePlace, pretty } from "../lib/places";
import { typePath, typePlural } from "../lib/links";
import { abs, jsonLd, schoolPath } from "../lib/seo";

export type TypeKey = "Day School" | "Boarding School" | "Play School";

async function load(typeKey: TypeKey, slug: string) {
  const schools = await fetchAllSchools();
  const place = resolvePlace(slug, schools);
  if (!place) return null;
  const list = schools.filter(
    (s) => s.type === typeKey && (place.kind === "city" ? s.city === place.name : stateFor(s) === place.name)
  );
  const content = await fetchLocationContent(place.kind, place.name);
  return { schools, place, list, content };
}

function facts(typeKey: TypeKey, name: string, list: School[]) {
  const label = typeKey.toLowerCase();
  const boards = Array.from(new Set(list.map((s) => BOARD_LABEL[s.board] ?? s.board)));
  const fees = list.map((s) => s.fee).filter((f) => f > 0);
  const { total, avg } = reviewSummary(list);
  const areas = Array.from(new Set(list.map((s) => s.area).filter(Boolean))).slice(0, 5);
  return { label, boards, fees, total, avg, areas, min: fees.length ? Math.min(...fees) : 0, max: fees.length ? Math.max(...fees) : 0 };
}

export async function typePlaceMetadata(typeKey: TypeKey, slug: string): Promise<Metadata> {
  const data = await load(typeKey, slug);
  if (!data) return { title: "Page not found", robots: { index: false } };
  const P = pretty(data.place.name);
  if (!data.list.length) return { title: `${typePlural(typeKey)} in ${P}`, robots: { index: false, follow: true } };
  const f = facts(typeKey, P, data.list);
  const title = `Best ${typePlural(typeKey)} in ${P} 2027-28 – Fees, Reviews & Admission`;
  const description = `Compare ${data.list.length} ${f.label}${data.list.length === 1 ? "" : "s"} in ${P}: ${f.boards.join(", ")}${
    f.min ? `, annual fees from ${formatFee(f.min)}` : ""
  }, facilities and parent reviews. Shortlist and enquire for 2027-28 admission on VidyaVista.`;
  const path = typePath(typeKey, data.place.name);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website" },
  };
}

export default async function TypePlacePage({ typeKey, slug }: { typeKey: TypeKey; slug: string }) {
  const data = await load(typeKey, slug);
  if (!data) notFound();
  const { schools, place, list, content } = data;
  const P = pretty(place.name);
  const f = facts(typeKey, P, list);
  const kindKey = place.kind === "city" ? "city" : "state";
  const heading = `${typePlural(typeKey)} in ${P}`;

  // admin text first; otherwise generated only from real data
  const description =
    content?.description ||
    `Looking for the best ${f.label}s in ${P}? VidyaVista lists ${list.length} ${f.label}${list.length === 1 ? "" : "s"} in ${P} with ${f.boards.join(", ")} curriculum${
      f.min ? `, annual fees starting from ${formatFee(f.min)}` : ""
    }. Compare facilities, read parent reviews and enquire directly for 2027-28 admission.`;

  const highlights = content?.highlights?.length
    ? content.highlights
    : [
        `${list.length} ${f.label}${list.length === 1 ? "" : "s"} listed in ${P}`,
        `Boards available: ${f.boards.join(", ")}`,
        ...(f.min ? [`Annual fees from ${formatFee(f.min)}${f.max > f.min ? ` to ${formatFee(f.max)}` : ""}`] : []),
        ...(f.total ? [`Parent rating ${f.avg.toFixed(1)} / 5 from ${f.total} review${f.total === 1 ? "" : "s"}`] : []),
        ...(f.areas.length ? [`Popular areas: ${f.areas.join(", ")}`] : []),
      ];

  const faqs = content?.faqs?.length
    ? content.faqs
    : [
        { q: `How many ${f.label}s are there in ${P}?`, a: `VidyaVista lists ${list.length} ${f.label}${list.length === 1 ? "" : "s"} in ${P}.` },
        { q: `Which boards do ${f.label}s in ${P} follow?`, a: `Boards available: ${f.boards.join(", ")}.` },
        ...(f.min
          ? [{ q: `What are the annual fees of ${f.label}s in ${P}?`, a: `Starting annual fees range from ${formatFee(f.min)}${f.max > f.min ? ` to ${formatFee(f.max)}` : ""}, depending on the school and class. Check each school's Fees section for the full breakup.` }]
          : []),
      ];

  const top = [...list].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 10);

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Best ${heading} 2027-28`,
      numberOfItems: list.length,
      itemListElement: list.slice(0, 50).map((s, i) => ({ "@type": "ListItem", position: i + 1, url: abs(schoolPath(s)), name: s.name })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
        { "@type": "ListItem", position: 2, name: "Schools", item: abs("/schools") },
        { "@type": "ListItem", position: 3, name: heading, item: abs(typePath(typeKey, place.name)) },
      ],
    },
    ...(faqs.length
      ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((q) => ({ "@type": "Question", name: q.q, acceptedAnswer: { "@type": "Answer", text: q.a } })) }]
      : []),
  ];

  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Navbar />

      {/* the real <h1> for Google; the big hero below follows the filters the visitor picks */}
      <h1 className="sr-only">Best {heading} 2027-28</h1>

      <Suspense fallback={null}>
        <SchoolsHero
          schools={schools}
          initial={{ type: typeKey, [kindKey]: place.name }}
          heading={`Best ${heading} 2027-28`}
          initialContent={content}
        />
        <SchoolListing schools={schools} initial={{ type: typeKey, [kindKey]: place.name }} showReviews={false} />
      </Suspense>

      {list.length === 0 && (
        <p className="mx-auto max-w-3xl px-5 pb-16 text-center text-[#5C6A7B]">
          We are adding {typeKey.toLowerCase()}s in {P}. Try another type or nearby city from the filters above.
        </p>
      )}

      {list.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pt-10 lg:px-8">
          <h2 className="text-2xl font-extrabold text-[#0B2A47] sm:text-3xl">About {heading}</h2>
          <div className="mt-4 max-w-4xl"><ClampedText text={description} lines={5} className="leading-8 text-[#4E5A68]" /></div>
        </section>
      )}

      {list.length > 0 && (<>
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <h2 className="text-2xl font-extrabold text-[#0B2A47] sm:text-3xl">Key highlights of {heading}</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {highlights.map((h) => (
            <li key={h} className="flex gap-3 rounded-2xl border border-[#E1E7EE] bg-[#F6FAFD] px-4 py-4 text-[#4E5A68]">
              <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-[#0795DC]" />{h}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10 lg:px-8">
        <h2 className="text-2xl font-extrabold text-[#0B2A47] sm:text-3xl">Top {heading}</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-2">
          {top.map((s, i) => (
            <li key={s.id}>
              <Link href={schoolPath(s)} className="flex items-center gap-4 rounded-2xl border border-[#E1E7EE] bg-white p-4 transition hover:border-[#0795DC] hover:shadow-md">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E1F1FA] text-sm font-extrabold text-[#0A5C91]">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold text-[#0B2A47]">{s.name}</span>
                  <span className="block truncate text-sm text-[#707E8F]">{s.area}, {pretty(s.city)} · {BOARD_LABEL[s.board] ?? s.board}{s.fee ? ` · from ${formatFee(s.fee)}` : ""}</span>
                </span>
                {s.reviews > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-[#C8104F]"><Icon name="star" filled className="h-4 w-4" />{s.rating.toFixed(1)}</span>
                )}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <LocationReviews place={P} schools={list} />

      {faqs.length > 0 && (
        <section className="mx-auto max-w-4xl px-5 pb-12 lg:px-8">
          <h2 className="mb-6 text-2xl font-extrabold text-[#0B2A47] sm:text-3xl">FAQs about {heading}</h2>
          <FaqList faqs={faqs} />
        </section>
      )}
      </>)}

      <RelatedLinks schools={schools} initial={{ kind: place.kind, name: place.name }} />
      <Footer />
    </main>
  );
}
