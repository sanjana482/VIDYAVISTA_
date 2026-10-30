import Link from "next/link";
import FaqList from "./profile/FaqList";
import type { School } from "../data/schools";
import type { LocationContent } from "../lib/locationsApi";
import { listingFaqs } from "../data/faqs";
import { typeLabel } from "../lib/links";
import { pretty } from "../lib/places";
import { abs, jsonLd, schoolPath, schoolSectionPath } from "../lib/seo";
import Icon from "./Icon";

type Props = { type: string; placeName: string; url: string; list: School[]; content: LocationContent | null };

const absUrl = (u: string) => (u.startsWith("http") ? u : abs(u));

export default function LocationExtras({ type, placeName, url, list, content }: Props) {
  const name = pretty(placeName);
  const label = typeLabel(type);

  // sirf unhi schools ki rating jinke asli reviews hain
  const rated = list.filter((s) => s.reviews > 0 && s.rating > 0);
  const totalReviews = rated.reduce((n, s) => n + s.reviews, 0);
  const avg = totalReviews ? rated.reduce((n, s) => n + s.rating * s.reviews, 0) / totalReviews : 0;
  const top = [...rated].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 3);

  const photos = (content?.photos ?? []).filter(Boolean);
  const faqs = content?.faqs?.length ? content.faqs : listingFaqs.map(([q, a]) => ({ q, a }));

  const schema: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${label} in ${name}`,
      numberOfItems: list.length,
      itemListElement: list.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: abs(schoolPath(s)),
        name: s.name,
        image: s.image,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
        { "@type": "ListItem", position: 2, name: "Schools", item: abs("/schools") },
        { "@type": "ListItem", position: 3, name: `${label} in ${name}`, item: abs(url) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  if (photos.length) {
    schema.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${label} in ${name}`,
      url: abs(url),
      image: photos.map(absUrl),
    });
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />

      {top.length > 0 && (
        <section aria-labelledby="loc-reviews" className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
          <h2 id="loc-reviews" className="text-2xl font-extrabold text-[#0B2A47]">
            Parent ratings for {label.toLowerCase()} in {name}
          </h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
            <div className="rounded-2xl border border-[#E1E7EE] bg-gradient-to-br from-[#E6F4FC] to-[#FDE8EF] p-6">
              <p className="text-5xl font-extrabold text-[#0B2A47]">{avg.toFixed(1)}<Icon name="star" filled className="ml-1 inline h-6 w-6 text-[#C8104F]" /></p>
              <p className="mt-2 text-sm text-[#4E5A68]">
                Average rating from {totalReviews} parent {totalReviews === 1 ? "review" : "reviews"} across {rated.length} {rated.length === 1 ? "school" : "schools"}.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3">
              {top.map((s) => (
                <li key={s.id}>
                  <Link
                    href={schoolSectionPath(s, "reviews")}
                    className="block h-full rounded-2xl border border-[#E1E7EE] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#9ED8F5] hover:shadow-lg"
                  >
                    <p className="font-extrabold text-[#0B2A47]">{s.name}</p>
                    <p className="mt-1 text-sm text-[#707E8F]">{pretty(s.area)}, {pretty(s.city)}</p>
                    <p className="mt-3 text-sm font-extrabold text-[#C8104F]"><Icon name="star" filled className="mr-1 inline h-4 w-4 align-[-2px]" />{s.rating} <span className="font-semibold text-[#5C6A7B]">· {s.reviews} reviews</span></p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {photos.length > 0 && (
        <section aria-labelledby="loc-photos" className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
          <h2 id="loc-photos" className="text-2xl font-extrabold text-[#0B2A47]">
            Photos: {label.toLowerCase()} in {name}
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.map((p, i) => (
              <li key={p} className="overflow-hidden rounded-2xl border border-[#E1E7EE] bg-[#E1F1FA]">
                <img src={p} alt={`${label} in ${name} – photo ${i + 1}`} loading="lazy" className="h-48 w-full object-cover" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-gradient-to-b from-[#F6FAFD] to-[#FDE8EF]/60 py-14">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#0B2A47]">FAQs about {label.toLowerCase()} in {name}</h2>
          <div className="mt-8"><FaqList faqs={faqs} /></div>
        </div>
      </section>
    </>
  );
}