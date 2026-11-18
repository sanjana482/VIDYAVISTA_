"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Row } from "../../lib/browse";

/** A list of category links. Every link is in the HTML (good for Google); long lists are only folded for the eye. */
export default function RowGrid({ rows, limit = 12 }: { rows: Row[]; limit?: number }) {
  const [all, setAll] = useState(false);
  const folded = rows.length > limit && !all;
  return (
    <>
      <ul className="grid gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r, i) => (
          <li key={r.key} hidden={folded && i >= limit}>
            <Link href={r.href} className="group flex items-baseline gap-2 border-b border-[#E3EAF2] px-1 py-3.5 transition hover:bg-[#F3F8FC]">
              <span className="min-w-0">
                <span className="block truncate font-semibold text-[#0B2A47]">{r.label}</span>
                {r.sub && <span className="block truncate text-xs text-[#6A7C8F]">{r.sub}</span>}
              </span>
              <span aria-hidden className="mx-1 min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[#BFCFDF]" />
              <span className="text-sm font-bold tabular-nums text-[#0A5C91]">{r.count}</span>
              <ArrowRight aria-hidden className="-ml-1 h-4 w-4 -translate-x-1 self-center text-[#EC0E58] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > limit && (
        <button type="button" onClick={() => setAll(!all)} className="mt-4 rounded-xl border border-[#D6DDE5] px-5 py-2.5 text-sm font-bold text-[#0A5C91] hover:border-[#0795DC]">
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </>
  );
}
