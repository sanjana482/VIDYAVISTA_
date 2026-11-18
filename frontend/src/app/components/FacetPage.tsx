// SEO landing pages that are built from live data (nothing is typed by hand):
//   /boarding-schools/india                          Best Boarding Schools in India   (hub with every category)
//   /boarding-schools/india/board/cbse               Best CBSE Boarding Schools in India
//   /boarding-schools/maharashtra/gender/girls       Best Girls Boarding Schools in Maharashtra
//   /day-schools/mumbai/fees/under-50000             Best Day Schools in Mumbai with Annual Fees Under ₹50,000
//   /day-schools/mumbai/area/andheri                 Best Day Schools in Andheri, Mumbai
// Day and play schools always need a city (or state). "India" is only for boarding schools.
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SchoolListing from "./SchoolListing";
import FaqList from "./profile/FaqList";
import Icon from "./Icon";
import ScopeSections from "./browse/ScopeSections";
import ClampedText from "./ClampedText";
import { BOARD_LABEL, formatFee, type School } from "../data/schools";
import { fetchAllSchools } from "../lib/schoolsApi";
import { fetchLocationContent } from "../lib/locationsApi";
import { resolvePlace, pretty } from "../lib/places";
import { typePlural } from "../lib/links";
import { abs, jsonLd, schoolPath } from "../lib/seo";
import { resolveFacet, scopeBase, scopeSchools, whereText, type Facet, type Place, type Scope, type TypeKey } from "../lib/browse";
import type { ListingInitial } from "../lib/useListingParams";

type Args = { typeKey: TypeKey; placeSlug: string; facet?: string; value?: string };

async function load({ typeKey, placeSlug, facet, value }: Args) {
  const schools = await fetchAllSchools();
  let place: Place = null;
  if (placeSlug === "india") {
    if (typeKey !== "Boarding School") return null; // no all-India list for day / play schools
  } else {
    place = resolvePlace(placeSlug, schools);
    if (!place) return null;
  }
  const scope: Scope = { type: typeKey, place };
  const pool = scopeSchools(schools, scope);
  let fx: Facet | null = null;
  if (facet) {
    fx = resolveFacet(facet, value ?? "", pool, place);
    if (!fx) return null;
  }
  const list = fx ? pool.filter(fx.match) : pool;
  const heading = `${fx?.prefix ?? ""}${typePlural(typeKey)} ${fx?.where ?? whereText(scope)}${fx?.suffix ?? ""}`;
  const path = facet ? `${scopeBase(scope)}/${facet}/${value}` : scopeBase(scope);
  const content = place ? await fetchLocationContent(place.kind, place.name).catch(() => null) : null;
  return { schools, scope, place, fx, list, heading, path, content };
}

function facts(list: School[]) {
  const boards = Array.from(new Set(list.map((s) => BOARD_LABEL[s.board] ?? s.board)));
  const fees = list.map((s) => s.fee).filter((f) => f > 0);
  return { boards, min: fees.length ? Math.min(...fees) : 0, max: fees.length ? Math.max(...fees) : 0 };
}

export async function facetMetadata(args: Args): Promise<Metadata> {
  const d = await load(args);
  if (!d) return { title: "Page not found", robots: { index: false } };
  const title = d.content?.metaTitle || `Best ${d.heading} 2027-28 – Fees, Reviews & Admission`;
  if (!d.list.length) return { title, robots: { index: false, follow: true }, alternates: { canonical: d.path } };
  const f = facts(d.list);
  const description =
    d.content?.description ||
    `Compare ${d.list.length} ${typePlural(args.typeKey).toLowerCase()} ${d.fx?.where ?? whereText(d.scope)}${
      d.fx?.suffix ? d.fx.suffix.toLowerCase() : ""
    }: ${f.boards.slice(0, 4).join(", ")}${f.min ? `, annual fees from ${formatFee(f.min)}` : ""}, facilities and parent reviews. Shortlist and enquire for 2027-28 admission on VidyaVista.`;
  return { title, description, alternates: { canonical: d.path }, openGraph: { title, description, url: d.path, type: "website" } };
}

export default async function FacetPage(args: Args) {
  const d = await load(args);
  if (!d) notFound();
  const { schools, scope, place, fx, list, heading, path, content } = d;
  const f = facts(list);
  const noun = typePlural(args.typeKey).toLowerCase();
  const top = [...list].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 10);
  const initial: ListingInitial = {
    type: args.typeKey,
    ...(place ? (place.kind === "city" ? { city: place.name } : { state: place.name }) : {}),
    ...(fx?.listing ?? {}),
  };

  const dynamicDescription =
    content?.description ||
    (list.length > 0
      ? `Explore ${list.length} top ${noun} ${fx?.where ?? whereText(scope)}${fx?.suffix ? fx.suffix.toLowerCase() : ""}. Compare affiliated boards (${f.boards.slice(0, 4).join(", ")})${f.min ? `, annual fees from ${formatFee(f.min)}` : ""}, campus amenities, student-teacher ratio and authentic parent reviews before applying for 2027-28 admission on VidyaVista.`
      : "We are adding schools here. Please check a nearby place or category below.");

  const faqs = [
    { q: `How many ${noun} are listed ${fx?.where ?? whereText(scope)}${fx?.suffix ? fx.suffix.toLowerCase() : ""}?`, a: `VidyaVista lists ${list.length} ${noun} ${fx?.where ?? whereText(scope)}${fx?.suffix ? fx.suffix.toLowerCase() : ""}.` },
    ...(f.boards.length ? [{ q: `Which boards do these ${noun} follow?`, a: `Boards available: ${f.boards.join(", ")}.` }] : []),
    ...(f.min ? [{ q: `What are the annual fees of these ${noun}?`, a: `Annual fees range from ${formatFee(f.min)}${f.max > f.min ? ` to ${formatFee(f.max)}` : ""}, depending on the school and class. Open a school’s Fees section for the full breakup.` }] : []),
    ...(top[0] && top[0].reviews > 0 ? [{ q: `Which is the top rated school here?`, a: `${top[0].name} has a parent rating of ${top[0].rating.toFixed(1)} out of 5 from ${top[0].reviews} review${top[0].reviews === 1 ? "" : "s"}.` }] : []),
  ];

  const typeRoot = args.typeKey === "Boarding School" ? "/boarding-schools/india" : "/";
  const crumbs = [
    { name: "Home", item: abs("/") },
    { name: typePlural(args.typeKey), item: abs(typeRoot) },
    ...(place ? [{ name: pretty(place.name), item: abs(scopeBase(scope)) }] : []),
    ...(fx ? [{ name: heading, item: abs(path) }] : []),
  ];
  const schema = [
    { "@context": "https://schema.org", "@type": "ItemList", name: `Best ${heading} 2027-28`, numberOfItems: list.length,
      itemListElement: list.slice(0, 50).map((s, i) => ({ "@type": "ListItem", position: i + 1, url: abs(schoolPath(s)), name: s.name })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })) },
    ...(faqs.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) }] : []),
  ];

  return (
    <main data-page="listing" className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Navbar />

      <section className="bg-[#EEF4FA]">
        <div className="mx-auto max-w-[1720px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-12">
          <nav aria-label="Breadcrumb" className="text-sm text-[#5F7389]">
            <Link href="/" className="hover:text-[#0A5C91]">Home</Link>
            <span aria-hidden className="mx-2">/</span>
            {(place || fx) ? (
              <>
                <Link href={typeRoot} className="hover:text-[#0A5C91]">{typePlural(args.typeKey)}</Link>
                {place && <><span aria-hidden className="mx-2">/</span>{fx ? <Link href={scopeBase(scope)} className="hover:text-[#0A5C91]">{pretty(place.name)}</Link> : <span>{pretty(place.name)}</span>}</>}
              </>
            ) : (
              <span>{typePlural(args.typeKey)}</span>
            )}
          </nav>
          <h1 className="vv-display mt-4 max-w-4xl text-3xl font-extrabold leading-[1.08] text-[#0B2A47] sm:text-5xl">Best {heading} 2027-28</h1>
          <div className="mt-4 max-w-3xl">
            <ClampedText text={dynamicDescription} lines={3} className="text-base leading-7 text-[#41566B] sm:text-lg" />
          </div>
        </div>
      </section>

      {list.length > 0 && (
        <Suspense fallback={null}>
          <SchoolListing schools={schools} initial={initial} showReviews={false} />
        </Suspense>
      )}

      {list.length > 0 && (
        <section className="mx-auto max-w-[1720px] px-4 py-10 sm:px-6 lg:px-8 xl:px-12">
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
      )}

      {/* every other category of the same page: gives visitors and Google a path to all sibling pages */}
      <section className="mx-auto max-w-[1240px] px-4 pb-12 pt-4 sm:px-6">
        <ScopeSections schools={schools} scope={scope} showTotal={false} />
      </section>

      {faqs.length > 0 && list.length > 0 && (
        <section className="mx-auto max-w-4xl px-5 pb-12 lg:px-8">
          <h2 className="mb-6 text-2xl font-extrabold text-[#0B2A47] sm:text-3xl">FAQs about {heading}</h2>
          <FaqList faqs={faqs} />
        </section>
      )}
      <Footer />
    </main>
  );
}
