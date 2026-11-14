import type { Metadata } from "next";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Categories from "./components/Categories";
import BoardCards from "./components/BoardCards";
import PopularLocations from "./components/PopularLocations";
import FeaturedSchools from "./components/FeaturedSchools";
import HighestRatedSchools from "./components/HighestRatedSchools";
import RecommendedSchools from "./components/RecommendedSchools";
import SchoolGuidance from "./components/SchoolGuidance";
import Footer from "./components/Footer";
import FAQ from "./components/FAQ";
import { jsonLd } from "./lib/seo";
import { homeFaqs } from "./data/faqs";
import { fetchAllSchoolsSafe } from "./lib/schoolsApi";
import { stateFor } from "./data/schools";
import Reveal from "./components/Reveal";

// Cached for 24 hours (86400s) to prevent Vercel ISR spikes; use /api/revalidate for instant updates.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "VidyaVista | Find the Best Day & Boarding Schools in India" },
  description:
    "Search day, boarding and day-cum-boarding schools across India. Compare fees, CBSE / ICSE / IB boards, facilities and parent reviews, then enquire for 2027-28 admission.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const schools = await fetchAllSchoolsSafe();
  const rawFeatured = schools.filter((s) => s.isFeatured);
  const featured = rawFeatured.length >= 3 ? rawFeatured : [...rawFeatured, ...schools.slice(0, 6 - rawFeatured.length)];

  const rawRecommended = schools.filter((s) => s.isRecommended);
  const recommended = rawRecommended.length >= 3 ? rawRecommended : [...rawRecommended, ...schools.slice(6, 12 - rawRecommended.length)];

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: homeFaqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }),
        }}
      />
      <Navbar />
      <Hero schools={schools.map((s) => ({ id: s.id, name: s.name, city: s.city, state: stateFor(s) }))} />
      <Reveal><Categories /></Reveal>
      <Reveal><PopularLocations /></Reveal>
      <Reveal><FeaturedSchools list={featured} /></Reveal>
      <Reveal><HighestRatedSchools list={schools} /></Reveal>
      <Reveal><RecommendedSchools list={recommended} /></Reveal>
      <Reveal><BoardCards list={schools.map((s) => ({ type: s.type, board: s.board }))} /></Reveal>
      <Reveal><SchoolGuidance /></Reveal>
      <Reveal><FAQ /></Reveal>
      <Footer />
    </main>
  );
}
