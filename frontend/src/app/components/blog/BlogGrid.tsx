"use client";

import { useState } from "react";
import type { BlogCardData } from "../../lib/blogApi";
import BlogCard from "./BlogCard";

export default function BlogGrid({ posts, categories }: { posts: BlogCardData[]; categories: string[] }) {
  const [cat, setCat] = useState("All");
  const list = cat === "All" ? posts : posts.filter((p) => p.category === cat);
  const [first, ...rest] = list;

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter articles by topic">
        {["All", ...categories].map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              cat === c ? "border-[#0B2A47] bg-[#0B2A47] text-white" : "border-[#D6DDE5] text-[#41566B] hover:border-[#0795DC]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-[#F3F8FC] p-6 text-[#41566B]">No articles in this topic yet.</p>
      ) : (
        <div className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {first && (
            <div className="md:col-span-2 lg:col-span-2">
              <BlogCard post={first} variant="feature" />
            </div>
          )}
          {rest.map((p) => (
            <BlogCard key={p.slug} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
