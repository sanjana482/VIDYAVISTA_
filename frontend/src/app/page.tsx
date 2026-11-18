import type { Metadata } from "next";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Categories from "./components/Categories";
import { FinderProvider } from "./components/home/FinderProvider";
import BrowseSections from "./components/home/BrowseSections";
import FeaturedSchools from "./components/FeaturedSchools";
import ParentDesk from "./components/ParentDesk";
import HighestRatedSchools from "./components/HighestRatedSchools";
import PopularLocations from "./components/PopularLocations";
import ParentVoices from "./components/ParentVoices";
import BoardCards from "./components/BoardCards";
import SchoolGuidance from "./components/SchoolGuidance";
import RecommendedSchools from "./components/RecommendedSchools";
import BlogSection from "./components/home/BlogSection";
import ForSchoolsBand from "./components/ForSchoolsBand";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import Reveal from "./components/Reveal";
import { jsonLd } from "./lib/seo";
import { homeFaqs } from "./data/faqs";
import { fetchAllSchoolsSafe } from "./lib/schoolsApi";
import { fetchPosts } from "./lib/blogApi";

// Cached for 24 hours (86400s) to prevent Vercel ISR spikes; use /api/revalidate for instant updates.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "VidyaVista | Find the Best Day & Boarding Schools in India" },
  description:
    "Search day, boarding and day-cum-boarding schools across India. Compare fees, CBSE / ICSE / IB boards, facilities and parent reviews, then enquire for 2027-28 admission.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [schools, { posts }] = await Promise.all([fetchAllSchoolsSafe(), fetchPosts(4)]);

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
      {/* 1. Navbar */}
      <Navbar />

      {/* 2. Hero: Find the School That Feels Right + Integrated Image 2 Search Bar */}
      <Hero schools={schools} />

      {/* 3. Explore Schools Your Way (Image 3) */}
      <Reveal>
        <Categories />
      </Reveal>

      {/* 4. Which school fits your child? (Browse by location/type + Jump to Gender/Fees/Board/Area) */}
      <FinderProvider schools={schools}>
        <BrowseSections />
      </FinderProvider>

      {/* 5. Featured Schools (Filtered by cookie type & city, min 10 schools) */}
      <Reveal>
        <FeaturedSchools allSchools={schools} />
      </Reveal>

      {/* 6. Three checks before you fill a form */}
      <Reveal>
        <ParentDesk />
      </Reveal>

      {/* 7. Highest Rated Schools (Filtered by cookie type & city, min 10 schools) */}
      <Reveal>
        <HighestRatedSchools allSchools={schools} />
      </Reveal>

      {/* 8. Top States for Boarding Schools & Popular Cities for Day Schools (Image 4) */}
      <Reveal>
        <PopularLocations />
      </Reveal>

      {/* 9. The same four questions, every city */}
      <Reveal>
        <ParentVoices list={schools} />
      </Reveal>

      {/* 10. Find schools by board (Image 5) */}
      <Reveal>
        <BoardCards list={schools} />
      </Reveal>

      {/* 11. A simpler path to the right school & Talk to a school counsellor, free */}
      <Reveal>
        <SchoolGuidance />
      </Reveal>

      {/* 12. Recommended Schools (Compact horizontal slider, NO images) */}
      <Reveal>
        <RecommendedSchools allSchools={schools} />
      </Reveal>

      {/* 13. Read before you shortlist (Blog, compact clean images) */}
      <BlogSection posts={posts} />

      {/* 14. Partner / For Schools Band */}
      <ForSchoolsBand />

      {/* 15. FAQs */}
      <Reveal>
        <FAQ />
      </Reveal>

      {/* 16. Footer */}
      <Footer />
    </main>
  );
}
