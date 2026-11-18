import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogCardData } from "../../lib/blogApi";
import BlogCard from "../blog/BlogCard";

/** Latest posts from the admin. Shows nothing until at least one post is published. */
export default function BlogSection({ posts }: { posts: BlogCardData[] }) {
  const [lead, ...others] = posts.slice(0, 4);
  if (!lead) return null;
  return (
    <section id="guides" className="bg-[#F6F9FC] py-12 sm:py-16 border-t border-[#E8EEF5]">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-[#EAF4FB] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#0A5C91]">
              Parent Guides
            </span>
            <h2 className="vv-display mt-2 text-2xl font-extrabold text-[#0B2A47] sm:text-3xl lg:text-4xl">
              Read before you shortlist
            </h2>
            <p className="mt-2 max-w-xl text-xs sm:text-sm text-[#4A5C70]">
              Short guides on boards, fees, boarding and admissions, written for parents.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0A5C91] hover:text-[#EC0E58] transition"
          >
            All articles <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className={`mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10`}>
          <BlogCard post={lead} variant="feature" />
          {others.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-[#EEF4FA]/60 p-3 sm:p-4 border border-[#E3EDF6]">
              {others.map((p) => (
                <BlogCard key={p.slug} post={p} variant="row" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
