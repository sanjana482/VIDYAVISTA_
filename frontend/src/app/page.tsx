
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

// the homepage re-reads schools / ticks / locations from the admin every minute
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "VidyaVista | Find the Best Day & Boarding Schools in India" },
  description:
    "Search day, boarding and day-cum-boarding schools across India. Compare fees, CBSE / ICSE / IB boards, facilities and parent reviews, then enquire for 2027-28 admission.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const schools = await fetchAllSchoolsSafe();
  const featured = schools.filter((s) => s.isFeatured);
  const recommended = schools.filter((s) => s.isRecommended);

  return (
    <main className="min-h-screen">
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
