// "Parent reviews in <place>": rolled up from the reviews of every school in that city / state.
// A state automatically includes the reviews of all its cities. No hooks, so it also renders on the server (good for SEO).
import Link from "next/link";
import Icon, { Stars } from "./Icon";
import type { School } from "../data/schools";
import { schoolPath } from "../lib/seo";

export function reviewSummary(schools: School[]) {
  const rated = schools.filter((s) => s.reviews > 0 && s.rating > 0);
  const total = rated.reduce((n, s) => n + s.reviews, 0);
  const avg = total ? rated.reduce((n, s) => n + s.rating * s.reviews, 0) / total : 0;
  return { total, avg: Math.round(avg * 10) / 10, rated };
}

export default function LocationReviews({ place, schools }: { place: string; schools: School[] }) {
  const { total, avg, rated } = reviewSummary(schools);
  if (!total) return null;

  const top = [...rated].sort((a, b) => b.reviews - a.reviews || b.rating - a.rating).slice(0, 6);
  const latest = schools
    .flatMap((s) => (s.reviewList ?? []).map((r) => ({ ...r, school: s })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  return (
    <section aria-label={`Parent reviews for schools in ${place}`} className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <h2 className="text-2xl font-extrabold text-[#0B2A47] sm:text-3xl">Parent reviews for schools in {place}</h2>
      <div className="mt-5 flex flex-wrap items-center gap-6 rounded-2xl border border-[#E1E7EE] bg-[#F6FAFD] p-6">
        <div>
          <p className="text-5xl font-extrabold text-[#0B2A47]">{avg.toFixed(1)}<span className="text-xl text-[#707E8F]"> / 5</span></p>
          <Stars value={avg} className="mt-1 h-5 w-5" />
        </div>
        <p className="max-w-xl leading-7 text-[#4E5A68]">
          <strong>{total.toLocaleString("en-IN")}</strong> parent {total === 1 ? "review" : "reviews"} across{" "}
          <strong>{rated.length}</strong> {rated.length === 1 ? "school" : "schools"} in {place}.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-extrabold text-[#0B2A47]">Most reviewed schools in {place}</h3>
          <ul className="mt-3 space-y-2">
            {top.map((s) => (
              <li key={s.id}>
                <Link href={schoolPath(s)} className="flex items-center justify-between gap-3 rounded-xl border border-[#E1E7EE] bg-white px-4 py-3 text-sm font-semibold text-[#0A5C91] hover:border-[#0795DC]">
                  <span className="truncate">{s.name}{s.area ? `, ${s.area}` : ""}</span>
                  <span className="flex shrink-0 items-center gap-1 text-[#C8104F]">
                    <Icon name="star" filled className="h-4 w-4" />{s.rating.toFixed(1)}
                    <span className="font-medium text-[#707E8F]">({s.reviews})</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {latest.length > 0 && (
          <div>
            <h3 className="font-extrabold text-[#0B2A47]">Latest parent reviews</h3>
            <ul className="mt-3 space-y-3">
              {latest.map((r, i) => (
                <li key={i} className="rounded-xl border border-[#E1E7EE] bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-[#0B2A47]">{r.name} <span className="font-medium text-[#707E8F]">· {r.role}</span></p>
                    <Stars value={r.rating} className="h-3.5 w-3.5" />
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-[#4E5A68]">{r.text}</p>
                  <Link href={schoolPath(r.school)} className="mt-1 inline-block text-xs font-bold text-[#0A7BBF] hover:underline">{r.school.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
