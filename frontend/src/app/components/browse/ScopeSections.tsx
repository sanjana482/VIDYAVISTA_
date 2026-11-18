import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { School } from "../../data/schools";
import { scopeBase, scopeHeading, scopeSchools, sectionsFor, type Scope } from "../../lib/browse";
import RowGrid from "./RowGrid";

/**
 * Stacked sections for one scope, e.g. "Boarding schools in India":
 *   by gender  ->  by annual fees  ->  by board  ->  by state or region  ->  by city
 * or "Day schools in Mumbai": by gender -> by fees -> by board -> by area.
 * Works on the server too (no hooks), so Google sees all the links.
 */
export default function ScopeSections({ schools, scope, h = 2, showTotal = true, className = "" }: {
  schools: School[]; scope: Scope; h?: 2 | 3; showTotal?: boolean; className?: string;
}) {
  const sections = sectionsFor(schools, scope);
  const total = scopeSchools(schools, scope).length;
  const H = (h === 2 ? "h2" : "h3") as "h2" | "h3";
  if (sections.length === 0) {
    return (
      <p className={`rounded-2xl bg-[#F3F8FC] p-6 text-[#41566B] ${className}`}>
        We are adding {scopeHeading(scope).toLowerCase()}. Please check back soon.
      </p>
    );
  }
  return (
    <div className={className}>
      <nav aria-label="Jump to a category" className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5F7389]">Jump to</span>
        {sections.map((s) => (
          <a key={s.id} href={`#sec-${s.id}`} className="rounded-full border border-[#D6DDE5] bg-white px-3 py-1.5 text-xs font-bold text-[#41566B] transition hover:border-[#0795DC] hover:text-[#0A5C91]">
            {s.id === "region" ? "State" : s.id === "fees" ? "Fees" : s.id.charAt(0).toUpperCase() + s.id.slice(1)}
          </a>
        ))}
      </nav>

      {sections.map((s, i) => (
        <section key={s.id} id={`sec-${s.id}`} className={`scroll-mt-24 ${i === 0 ? "mt-8" : "mt-12 border-t border-[#E3EAF2] pt-10"}`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <H className="vv-display text-2xl font-extrabold text-[#0B2A47] sm:text-3xl">{s.title}</H>
              <p className="mt-1 text-sm text-[#5F7389]">{s.intro}</p>
            </div>
            {showTotal && i === 0 && (
              <Link href={scopeBase(scope)} className="inline-flex items-center gap-2 text-sm font-bold text-[#0A5C91] hover:text-[#EC0E58]">
                See all {total} {total === 1 ? "school" : "schools"} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
          <div className="mt-4">
            <RowGrid rows={s.rows} limit={s.id === "city" || s.id === "area" || s.id === "region" ? 12 : 99} />
          </div>
        </section>
      ))}
    </div>
  );
}
