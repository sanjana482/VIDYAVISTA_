import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ProfileHero from "../../components/profile/ProfileHero";
import ProfileTabs from "../../components/profile/ProfileTabs";
import EnquirySidebar from "../../components/profile/EnquirySidebar";
import FeeSection from "../../components/profile/FeeSection";
import ReviewSection from "../../components/profile/ReviewSection";
import PhotoGallery from "../../components/profile/PhotoGallery";
import FaqList from "../../components/profile/FaqList";
import ReadMore from "../../components/profile/ReadMore";
import MobileEnquire from "../../components/profile/MobileEnquire";
import ApplyModal from "../../components/profile/ApplyModal";
import { Admission, Contact, Facilities } from "../../components/profile/StaticSections";
import { stateFor } from "../../data/schools";
import { fetchAllSchools, fetchSchool } from "../../lib/schoolsApi";
import {
  abs, idFromParam, jsonLd, schoolPath, schoolSectionPath, schoolSlug, cityPath, statePath,
  SECTION_LABEL, type Section,
} from "../../lib/seo";
import { classList, feeRange, feeSlabs, getProfile, lakh, rupee, similarSchools } from "../../data/profile";

export const findSchool = async (param: string) => {
  const id = Number(idFromParam(param));
  return Number.isFinite(id) && id > 0 ? fetchSchool(id) : undefined;
};

/** title / description / canonical for every tab page */
export async function schoolMetadata(param: string, section?: Section): Promise<Metadata> {
  const s = await findSchool(param);
  if (!s) return { title: "School not found", robots: { index: false } };
  const r = feeRange(s);
  const range = `${lakh(r.min)} - ${lakh(r.max)}`;
  const place = `${s.area}, ${s.city}`;
  const META: Record<Section | "about", [string, string]> = {
    about: [
      `${s.name}, ${s.area} – Fees, Admission 2027-28 & Reviews`,
      `${s.name} is a ${s.board} ${s.type.toLowerCase()} in ${place}. Annual fees ${range}. See fees, facilities, admission process and parent reviews.`,
    ],
    fees: [
      `${s.name} Fees 2027-28 – Class-wise Fee Structure`,
      `Class-wise fee structure of ${s.name}, ${place} for 2027-28. Annual fees ${range}, with a breakdown of every fee component.`,
    ],
    facilities: [
      `${s.name} Facilities – Campus & Infrastructure`,
      `Facilities available at ${s.name}, ${place}. Compare with other ${s.board} schools in ${s.city}.`,
    ],
    admission: [
      `${s.name} Admission 2027-28 – Process, Eligibility & Documents`,
      `How to apply to ${s.name}, ${place} for 2027-28: admission process, eligibility and documents.`,
    ],
    contact: [
      `${s.name} Contact Number, Address & Location`,
      `Phone number, address and location of ${s.name}, ${place}. Enquire for 2027-28 admission.`,
    ],
    photos: [
      `${s.name} Photos – Campus & Gallery`,
      `See photos of ${s.name}, ${place}.`,
    ],
    reviews: [
      `${s.name} Reviews & Ratings – Parent Feedback`,
      `Read parent reviews and ratings of ${s.name}, ${place}.`,
    ],
    faqs: [
      `${s.name} FAQs – Fees, Admission & More`,
      `Answers to common questions about ${s.name}, ${place}: fees, admission and more.`,
    ],
  };
  const [title, description] = META[section ?? "about"];
  const url = schoolSectionPath(s, section);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${title} | VidyaVista`,
      description,
      images: [{ url: s.image, alt: `${s.name} campus` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [s.image] },
  };
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-40 border-t border-[#E1E7EE] py-10 first:border-t-0">
      {children}
    </section>
  );
}

export default async function SchoolProfileView({ param, section }: { param: string; section?: Section }) {
  const s = await findSchool(param);
  if (!s) notFound();
  // one URL per page: /schools/9/fees -> /schools/<slug>-9/fees (permanent redirect)
  if (param !== schoolSlug(s)) permanentRedirect(schoolSectionPath(s, section));

  const show: Section | "about" = section ?? "about";
  const basePath = schoolPath(s);

  const p = getProfile(s);
  const range = feeRange(s);
  const rangeText = `${lakh(range.min)} - ${lakh(range.max)}`;
  const classes = classList(s);
  const lastCls = classes[classes.length - 1].cls;
  const slabs = { "2027-28": feeSlabs(s, "2027-28"), "2026-27": feeSlabs(s, "2026-27") };
  const similar = similarSchools(s, await fetchAllSchools());

  const stats = [
    { label: "Board", value: s.board },
    { label: "School type", value: s.type },
    { label: "Classes", value: `${classes[0].cls} - ${lastCls}` },
    { label: "Established", value: String(p.established) },
    { label: "Student : Teacher", value: `${p.ratio} : 1` },
    { label: "Annual fee", value: `${lakh(range.min).replace(".00", "")} - ${lakh(range.max)}` },
    { label: "Students", value: p.students.toLocaleString("en-IN") },
    { label: "Campus", value: p.campus },
  ];

  const schoolSchema = {
    "@context": "https://schema.org",
    "@type": "School",
    "@id": abs(basePath),
    name: s.name,
    url: abs(basePath),
    image: s.image,
    description: p.intro,
    telephone: s.phone,
    foundingDate: String(p.established),
    address: {
      "@type": "PostalAddress",
      streetAddress: s.area,
      addressLocality: s.city === "Delhi" ? "New Delhi" : s.city,
      addressRegion: stateFor(s),
      addressCountry: "IN",
    },
    // only add rating when real reviews exist (Google penalises fake / empty ratings)
    ...(s.reviews > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.reviews, bestRating: 5 } }
      : {}),
  };

  const crumbs = [
    { name: "Home", item: abs("/") },
    { name: "Schools", item: abs("/schools") },
    { name: stateFor(s) || s.city, item: abs(stateFor(s) ? statePath(stateFor(s)) : cityPath(s.city)) },
    { name: s.city, item: abs(cityPath(s.city)) },
    { name: s.name, item: abs(basePath) },
    ...(section ? [{ name: SECTION_LABEL[section], item: abs(schoolSectionPath(s, section)) }] : []),
  ];
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: p.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const schema: object[] = [breadcrumbSchema];
  if (show === "about") schema.unshift(schoolSchema);
  if (show === "faqs") schema.push(faqSchema);

  return (
    <main className="min-h-screen bg-white pb-20 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Navbar />
      <ProfileHero school={s} intro={p.intro} phoneHref={p.contact.phoneHref} stats={stats} />
      <ProfileTabs basePath={basePath} active={show} />

      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1fr_370px] lg:px-8">
        <div className="min-w-0">
          {show === "about" && (
            <Section id="about">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#0B2A47]">About {s.name}</h2>
              <div className="mt-5"><ReadMore paragraphs={p.about} /></div>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {p.highlights.map((h) => (
                  <li key={h} className="flex gap-3 rounded-2xl border border-[#E1E7EE] bg-[#F6FAFD] px-4 py-4 text-[#4E5A68]">
                    <span className="font-extrabold text-[#0795DC]">✓</span>{h}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {show === "fees" && (
            <Section id="fees">
              <FeeSection schoolName={s.name} slabs={slabs} updated={p.feeUpdated} source={p.feeSource} />
            </Section>
          )}

          {show === "facilities" && <Section id="facilities"><Facilities p={p} /></Section>}
          {show === "admission" && <Section id="admission"><Admission p={p} /></Section>}
          {show === "contact" && <Section id="contact"><Contact p={p} name={s.name} /></Section>}

          {show === "photos" && (
            <Section id="photos">
              <h2 className="mb-6 text-3xl font-extrabold tracking-tight text-[#0B2A47]">School photos</h2>
              <PhotoGallery images={p.gallery} name={s.name} />
            </Section>
          )}

          {show === "reviews" && (
            <Section id="reviews">
              <ReviewSection schoolName={s.name} rating={s.rating} count={s.reviews} />
            </Section>
          )}

          {show === "faqs" && (
            <Section id="faqs">
              <h2 className="mb-6 text-3xl font-extrabold tracking-tight text-[#0B2A47]">FAQs about {s.name}</h2>
              <FaqList faqs={p.faqs} />
            </Section>
          )}
        </div>

        <div className="pb-10 pt-10 lg:pb-0">
          <EnquirySidebar
            schoolName={s.name}
            feeRange={rangeText}
            phone={p.contact.phone}
            phoneHref={p.contact.phoneHref}
            classes={classes.map((c) => c.cls)}
          />
        </div>
      </div>

      {/* Similar schools */}
      <section className="mt-6 bg-gradient-to-b from-[#F3F9FD] to-white py-14">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#0B2A47]">
            {similar.sameCity ? `Similar schools near ${s.area.split(",").slice(-1)[0].trim()}, ${s.city}` : "Similar schools you may like"}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.list.map((x) => (
              <Link key={x.id} href={schoolPath(x)} className="group overflow-hidden rounded-2xl border border-[#E1E7EE] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#9ED8F5] hover:shadow-xl hover:shadow-[#0795DC]/10">
                <div className="aspect-[16/8] overflow-hidden bg-[#E1F1FA]">
                  <img src={x.image} alt={`${x.name} campus`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-extrabold text-[#0B2A47] transition group-hover:text-[#0A7BBF]">{x.name}</h3>
                  <p className="mt-1 text-sm text-[#707E8F]">{x.area}, {x.city}</p>
                  <p className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-extrabold text-[#EC0E58]">View school →</span>
                    <span className="text-[#5C6A7B]">from {rupee(x.fee)}</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="mx-auto max-w-6xl px-5 pb-16 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-gradient-to-r from-[#0A5C91] via-[#0795DC] to-[#EC0E58] px-8 py-10 text-white shadow-2xl shadow-[#0795DC]/25 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">Need help choosing the right school?</h2>
            <p className="mt-2 max-w-xl text-white/90">Talk to a free counsellor, compare fees and shortlist schools that match your child&apos;s needs.</p>
          </div>
          <Link href="/counselling" className="shrink-0 rounded-xl bg-white px-7 py-4 text-sm font-extrabold text-[#0A5C91] shadow-lg transition hover:-translate-y-0.5">
            Get Counselling →
          </Link>
        </div>
      </section>

      <Footer
        context={{
          state: stateFor(s),
          city: s.city,
          schoolName: s.name,
          related: similar.list.map((x) => ({ name: x.name, href: schoolPath(x) })),
        }}
      />

      <ApplyModal
        schoolName={s.name}
        city={s.city}
        status={p.admission.status}
        classes={classes.map((c) => c.cls)}
        slabs={slabs}
      />

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex gap-3 border-t border-[#E1E7EE] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(11,42,71,0.08)] backdrop-blur lg:hidden">
        <a href={`tel:${p.contact.phoneHref}`} className="flex-1 rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] py-3.5 text-center text-sm font-extrabold text-white">📞 Call Now</a>
        <MobileEnquire />
      </div>
    </main>
  );
}