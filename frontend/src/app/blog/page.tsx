import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BlogGrid from "../components/blog/BlogGrid";
import { fetchPosts } from "../lib/blogApi";
import { abs, jsonLd } from "../lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "School Guides and Admission Advice for Parents",
  description:
    "Practical guides on choosing a board, understanding school fees, deciding between day and boarding school, and getting through admissions.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "School guides for parents | VidyaVista", description: "Practical advice on boards, fees, boarding and admissions.", url: "/blog", type: "website" },
};

export default async function BlogIndex() {
  const { posts, categories } = await fetchPosts();
  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "VidyaVista Blog",
            url: abs("/blog"),
            blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: abs(`/blog/${p.slug}`), datePublished: p.date })),
          }),
        }}
      />
      <Navbar />
      <section className="bg-[#EEF4FA]">
        <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="vv-display max-w-3xl text-4xl font-extrabold leading-[1.05] text-[#0B2A47] sm:text-5xl">
            Guides for choosing and applying to schools
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#41566B] sm:text-lg">
            Plain answers to the questions parents keep asking: which board, what the fee really covers, and when boarding makes sense.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14">
        {posts.length === 0 ? (
          <p className="rounded-2xl bg-[#F3F8FC] p-6 text-[#41566B]">New guides are on the way. Please check back soon.</p>
        ) : (
          <BlogGrid posts={posts} categories={categories} />
        )}
      </section>
      <Footer />
    </main>
  );
}
