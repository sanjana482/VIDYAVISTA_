// Server-rendered landing page for one state or one city (/schools-in/<city>, /schools-in/state/<state>).
// Title, description, photos and FAQs come from /admin/locations; defaults are generated when nothing is saved.
import ClampedText from "./ClampedText";
import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FaqList from "./profile/FaqList";
import { formatFee, stateFor, type School } from "../data/schools";
import { fillPhotos, resolveContent, type LocationContent, type LocationKind } from "../lib/locationsApi";
import { TYPE_ORDER, listingHref, typeLabel } from "../lib/links";
import { abs, cityPath, jsonLd, schoolPath, statePath } from "../lib/seo";
import { typeRank } from "../lib/preferences";
import ShowMore from "./ShowMore";

type Props = {
  kind: LocationKind;
  name: string;
  state: string; // for a state page this equals `name`
  list: School[]; // schools of this place
  all: School[]; // every school (for the "other places" links)
  content: LocationContent | null;
};

const chip = "rounded-full border border-[#D6DDE5] bg-white px-4 py-2 text-sm font-semibold text-[#0A5C91] hover:border-[#0795DC]";

export default function LocationLanding({ kind, name, state, list, all, content }: Props) {
  const view = resolveContent({ kind, name }, content, list.length);
  const photos = fillPhotos(view.photos);
  const parts = view.title.match(/^(.*?)\s*(20\d\d-\d\d)$/);
  const own = kind === "state" ? "state" : "city";

  // Boarding first, then Play School, then Day
  const sorted = [...list].sort((a, b) => typeRank(a.type) - typeRank(b.type) || b.rating - a.rating);
  const groups = TYPE_ORDER.map((t) => ({ t, items: sorted.filter((s) => s.type === t) })).filter((g) => g.items.length);

  const cityCounts = new Map<string, number>();
  all.filter((s) => stateFor(s) === state).forEach((s) => cityCounts.set(s.city, (cityCounts.get(s.city) ?? 0) + 1));
  const otherCities = Array.from(cityCounts.entries()).filter(([c]) => c !== name).sort((a, b) => b[1] - a[1]);
  const otherStates = Array.from(new Set(all.map(stateFor).filter((x) => x && x !== state))).sort();
  const boards = Array.from(new Set(list.map((s) => s.board)));

  const here = kind === "state" ? statePath(name) : cityPath(name);
  const crumbs = [
    { name: "Home", item: abs("/") },
    { name: "Schools", item: abs("/schools") },
    ...(kind === "city" && state ? [{ name: state, item: abs(statePath(state)) }] : []),
    { name, item: abs(here) },
  ];
  const schema: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: view.title,
      numberOfItems: list.length,
      itemListElement: sorted.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: abs(schoolPath(s)), name: s.name })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
    },
  ];
  if (view.faqs.length) {
    schema.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: view.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }

  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Navbar />

      <section className="bg-gradient-to-br from-[#E6F4FC] via-white to-[#FDE8EF]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-[#5C6A7B]">
              <Link href="/" className="hover:text-[#0A7BBF]">Home</Link><span className="mx-2">›</span>
              <Link href="/schools" className="hover:text-[#0A7BBF]">Schools</Link><span className="mx-2">›</span>
              {kind === "city" && state && (<><Link href={statePath(state)} className="hover:text-[#0A7BBF]">{state}</Link><span className="mx-2">›</span></>)}
              <span className="text-[#0B2A47]">{name}</span>
            </nav>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#0B2A47] sm:text-5xl">
              {parts ? (<>{parts[1]} <span className="text-[#0795DC]">{parts[2]}</span></>) : view.title}
            </h1>
            <div className="mt-4 max-w-3xl"><ClampedText text={view.description} lines={5} className="leading-7 text-[#4E5A68]" /></div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#4E5A68]">
              <span className="rounded-full border border-[#D6DDE5] bg-white px-4 py-2 shadow-sm"><strong className="text-[#0A5C91]">{list.length}</strong> {list.length === 1 ? "school" : "schools"}</span>
              {boards.map((b) => <span key={b} className="rounded-full border border-[#D6DDE5] bg-white px-4 py-2 shadow-sm">{b}</span>)}
            </div>
            <Link href={listingHref({ [own]: name })} className="mt-7 inline-block rounded-xl bg-gradient-to-r from-[#0A5C91] to-[#0795DC] px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#0A5C91]/25 vv-btn">
              Filter &amp; compare schools in {name} →
            </Link>
          </div>
          <div className="hidden grid-cols-2 gap-3 lg:grid">
            <div className="row-span-2 overflow-hidden rounded-3xl border-4 border-white shadow-xl shadow-[#0A5C91]/15">
              <img src={photos[0]} alt={`Schools in ${name}`} className="h-full w-full object-cover" />
            </div>
            <div className="overflow-hidden rounded-3xl border-4 border-white shadow-xl shadow-[#0A5C91]/15">
              <img src={photos[1]} alt={`${name} school students`} className="h-36 w-full object-cover" />
            </div>
            <div className="overflow-hidden rounded-3xl border-4 border-white shadow-xl shadow-[#EC0E58]/15">
              <img src={photos[2]} alt={`${name} school campus`} className="h-36 w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {groups.map(({ t, items }) => (
          <div key={t} className="mb-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-2xl font-extrabold text-[#0B2A47]">{typeLabel(t)} in {name}</h2>
              <Link href={listingHref({ type: t, [own]: name })} className="text-sm font-extrabold text-[#0A5C91] hover:underline">View all {typeLabel(t).toLowerCase()} →</Link>
            </div>
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <li key={s.id}>
                  <Link href={schoolPath(s)} className="group block overflow-hidden rounded-2xl border border-[#E1E7EE] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="aspect-[16/8] overflow-hidden bg-[#E1F1FA]">
                      <img src={s.image} alt={`${s.name} campus, ${s.area}`} loading="lazy" className="h-full w-full object-cover" />
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-extrabold text-[#0B2A47] group-hover:text-[#0A7BBF]">{s.name}</h3>
                      <p className="mt-1 text-sm text-[#707E8F]">{s.area}, {s.city} · {s.board} · {s.type}</p>
                      <p className="mt-3 text-sm font-extrabold text-[#EC0E58]">from {formatFee(s.fee)} / year</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!list.length && <p className="rounded-2xl border border-dashed border-[#C9D3DE] bg-[#F6FAFD] p-10 text-center text-[#5C6A7B]">No schools listed in {name} yet.</p>}

        {kind === "state" && cityCounts.size > 0 && (
          <div className="mt-2">
            <h2 className="text-lg font-extrabold text-[#0B2A47]">Cities in {name}</h2>
            <ShowMore className="mt-3 flex flex-wrap gap-3" initial={24} step={24}>
             {Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
                <li key={c}><Link href={cityPath(c)} className={chip}>Schools in {c} ({n})</Link></li>
              ))}
            </ShowMore>
          </div>
        )}
        {kind === "city" && (
          <div className="mt-2 space-y-8">
            {state && <div><Link href={statePath(state)} className={chip}>All schools in {state}</Link></div>}
            {otherCities.length > 0 && (
              <div>
                <h2 className="text-lg font-extrabold text-[#0B2A47]">Other cities in {state}</h2>
                <ShowMore className="mt-3 flex flex-wrap gap-3" initial={24} step={24}>
                  {otherCities.map(([c, n]) => <li key={c}><Link href={cityPath(c)} className={chip}>Schools in {c} ({n})</Link></li>)}
                </ShowMore>
              </div>
            )}
          </div>
        )}
        {otherStates.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-extrabold text-[#0B2A47]">Other states</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {otherStates.map((s) => <li key={s}><Link href={statePath(s)} className={chip}>Schools in {s}</Link></li>)}
            </ul>
          </div>
        )}
      </section>

      {view.faqs.length > 0 && (
        <section className="bg-gradient-to-b from-[#F6FAFD] to-[#FDE8EF]/60 py-14">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#0B2A47]">FAQs about schools in {name}</h2>
            <div className="mt-8"><FaqList faqs={view.faqs} /></div>
          </div>
        </section>
      )}

      <Footer context={{ state, city: kind === "city" ? name : undefined }} />
    </main>
  );
}
