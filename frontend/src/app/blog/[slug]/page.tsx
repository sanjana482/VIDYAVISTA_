import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import BlogCard from "../../components/blog/BlogCard";
import { fetchPost, formatPostDate } from "../../lib/blogApi";
import { abs, jsonLd } from "../../lib/seo";

type Props = { params: { slug: string } };

// Posts are not hard-coded: any post published in Django admin gets its own page on first visit.
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await fetchPost(params.slug);
  if (!post) return { title: "Article not found", robots: { index: false } };
  const images = post.cover ? [{ url: post.cover, alt: post.coverAlt }] : undefined;
  return {
    title: post.metaTitle,
    description: post.metaDescription,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.metaTitle, description: post.metaDescription, url: `/blog/${post.slug}`, images, publishedTime: post.date, modifiedTime: post.updatedAt },
    twitter: { card: post.cover ? "summary_large_image" : "summary", title: post.metaTitle, description: post.metaDescription, images: post.cover ? [post.cover] : undefined },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await fetchPost(params.slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: post.title,
              description: post.metaDescription,
              ...(post.cover ? { image: [post.cover] } : {}),
              datePublished: post.date,
              dateModified: post.updatedAt,
              author: { "@type": "Organization", name: post.author },
              publisher: { "@type": "Organization", name: "VidyaVista", logo: { "@type": "ImageObject", url: abs("/logo.png") } },
              mainEntityOfPage: abs(`/blog/${post.slug}`),
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
                { "@type": "ListItem", position: 2, name: "Blog", item: abs("/blog") },
                { "@type": "ListItem", position: 3, name: post.title, item: abs(`/blog/${post.slug}`) },
              ],
            },
          ]),
        }}
      />
      <Navbar />

      <article>
        <header className="bg-[#EEF4FA]">
          <div className="mx-auto max-w-[1100px] px-4 pb-10 pt-8 sm:px-6 sm:pt-10">
            <nav aria-label="Breadcrumb" className="text-sm text-[#5F7389]">
              <Link href="/" className="hover:text-[#0A5C91]">Home</Link>
              <span aria-hidden className="mx-2">/</span>
              <Link href="/blog" className="hover:text-[#0A5C91]">Blog</Link>
            </nav>
            <p className="mt-6 text-sm font-bold text-[#0A7BBF]">{post.category}</p>
            <h1 className="vv-display mt-2 max-w-3xl text-3xl font-extrabold leading-[1.08] text-[#0B2A47] sm:text-5xl">{post.title}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#41566B]">{post.excerpt}</p>
            <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5F7389]">
              <span>{post.author}</span>
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              <span>{post.readingMinutes} min read</span>
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
          {post.cover && <img src={post.cover} alt={post.coverAlt} className="mb-10 mt-8 aspect-[16/8] w-full rounded-3xl bg-[#E6F4FC] object-cover" />}

          <div className={`grid gap-12 pb-16 lg:grid-cols-[minmax(0,1fr)_300px] ${post.cover ? "" : "pt-10"}`}>
            <div className="vv-prose max-w-[720px]" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-2xl border border-[#D3E2F0] bg-[#F5F9FD] p-5">
                <p className="vv-display text-lg font-bold text-[#0B2A47]">Ready to look at schools?</p>
                <p className="mt-2 text-sm leading-6 text-[#41566B]">Pick day or boarding, then narrow by board, gender and fees.</p>
                {post.cta && (
                  <Link href={post.cta.href} className="vv-btn mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#EC0E58] px-4 text-sm font-extrabold text-white">
                    {post.cta.label}
                  </Link>
                )}
                <Link href="/boarding-schools/india" className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#0795DC] px-4 text-sm font-bold text-[#0A5C91] hover:bg-[#E6F4FC]">
                  Browse boarding schools
                </Link>
                <Link href="/#talk-to-us" className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#D6DDE5] px-4 text-sm font-bold text-[#0A5C91] hover:bg-[#F3F8FC]">
                  Talk to a counsellor
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>

      {post.related.length > 0 && (
        <section className="border-t border-[#E3EAF2] bg-[#FAFCFE]">
          <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6">
            <h2 className="vv-display text-2xl font-extrabold text-[#0B2A47]">Keep reading</h2>
            <div className="mt-6 grid gap-8 md:grid-cols-3">
              {post.related.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
      <Footer />
    </main>
  );
}
