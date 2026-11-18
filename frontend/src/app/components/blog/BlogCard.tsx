import Link from "next/link";
import { formatPostDate, type BlogCardData } from "../../lib/blogApi";

/** variant "feature" = lead card, "row" = small thumbnail + text, default = normal card.
 *  Image dimensions are bounded to keep them crisp, elegant and not excessively large. */
export default function BlogCard({ post, variant = "card" }: { post: BlogCardData; variant?: "card" | "feature" | "row" }) {
  const href = `/blog/${post.slug}`;
  const meta = (
    <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-[#5F7389]">
      <time dateTime={post.date}>{formatPostDate(post.date)}</time>
      <span>{post.readingMinutes} min read</span>
    </p>
  );

  if (variant === "row") {
    return (
      <Link href={href} className="group flex gap-4 rounded-2xl p-2.5 transition hover:bg-white hover:shadow-sm">
        {post.cover && (
          <img
            src={post.cover}
            alt={post.coverAlt}
            loading="lazy"
            className="h-20 w-24 sm:h-24 sm:w-32 shrink-0 rounded-xl bg-[#E6F4FC] object-cover"
          />
        )}
        <span className="min-w-0">
          <span className="text-xs font-bold text-[#0A7BBF]">{post.category}</span>
          <span className="vv-display mt-0.5 block text-sm sm:text-base font-bold leading-snug text-[#0B2A47] group-hover:text-[#0A5C91]">
            {post.title}
          </span>
          {meta}
        </span>
      </Link>
    );
  }

  const big = variant === "feature";
  return (
    <Link href={href} className="group block rounded-2xl bg-white p-4 sm:p-5 border border-[#E4EBF2] shadow-sm hover:shadow-md transition">
      {post.cover && (
        <div className="h-52 sm:h-60 w-full overflow-hidden rounded-xl bg-[#E6F4FC]">
          <img
            src={post.cover}
            alt={post.coverAlt}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <p className={`text-xs sm:text-sm font-bold text-[#0A7BBF] ${post.cover ? "mt-4" : ""}`}>{post.category}</p>
      <h3 className={`vv-display mt-1 font-extrabold leading-tight text-[#0B2A47] group-hover:text-[#0A5C91] ${big ? "text-xl sm:text-2xl" : "text-lg"}`}>
        {post.title}
      </h3>
      <p className={`mt-2 text-[#4A5C70] ${big ? "text-sm sm:text-base leading-6 sm:leading-7" : "line-clamp-2 text-xs sm:text-sm leading-5"}`}>
        {post.excerpt}
      </p>
      {meta}
    </Link>
  );
}
