"use client";

// Footer block that follows the visitor: links for the selected state / city, or for the school profile being viewed.
import Link from "next/link";

import { TYPE_ORDER, listingHref, typeLabel } from "../lib/links";
import { useActiveLocation, useLocationIndex } from "../lib/useActiveLocation";

export type FooterContext = {
  state?: string;
  city?: string;
  schoolName?: string;
  related?: { name: string; href: string }[]; // other schools to link to (profile page)
};

type Card = { title: string; href?: string; chips: { label: string; href: string }[] };

const chipCls = "rounded-full bg-white/[0.07] px-3 py-2 text-xs text-[#DEE4EA] transition hover:bg-[#FF6B9A] hover:text-[#0B2A47]";

export default function FooterLocationLinks({ context }: { context?: FooterContext }) {
  const active = useActiveLocation();
  const index = useLocationIndex();

  // what do we build the links for?
  let city = context?.city ?? (active?.kind === "city" ? active.name : "");
  let state = context?.state ?? (active?.kind === "state" ? active.name : "");
  const hasPlace = !!(context?.city || context?.state || active);
  if (!hasPlace) return null;
  if (city && !state) state = index.find((s) => s.cities.some((c) => c.name === city))?.state ?? "";

  const st = index.find((s) => s.state === state);
  const ct = st?.cities.find((c) => c.name === city);
  const cards: Card[] = [];

  // 1) the school being viewed -> related schools
  if (context?.related?.length) {
    cards.push({
      title: `Schools similar to ${context.schoolName ?? "this school"}`,
      chips: context.related.slice(0, 8).map((r) => ({ label: r.name, href: r.href })),
    });
  }

  // 2) city: type cards (+ boards)
  if (city) {
    const node = ct;
    TYPE_ORDER.filter((t) => !node || node.types[t]).forEach((t) => {
      cards.push({
        title: `${typeLabel(t)} in ${city}`,
        href: listingHref({ type: t, city }),
        chips: node
          ? Object.keys(node.boards).map((b) => ({ label: `${b} ${typeLabel(t).replace(" Schools", "")}`, href: listingHref({ type: t, board: b, city }) }))
          : [],
      });
    });
  }

  // 3) state: type cards, each listing the cities that have that type
  if (state) {
    TYPE_ORDER.filter((t) => !st || st.types[t]).forEach((t) => {
      cards.push({
        title: `${typeLabel(t)} in ${state}`,
        href: listingHref({ type: t, state }),
        chips: (st?.cities ?? []).filter((c) => c.types[t]).map((c) => ({ label: c.name, href: listingHref({ type: t, city: c.name }) })),
      });
    });
    const others = (st?.cities ?? []).filter((c) => c.name !== city);
    if (others.length) {
      cards.push({
        title: city ? `More cities in ${state}` : `All cities in ${state}`,
        href: listingHref({ state }),
        chips: others.map((c) => ({ label: `Schools in ${c.name}`, href: listingHref({ city: c.name }) })),
      });
    }
  }

  if (!cards.length) return null;
  const heading = context?.schoolName ? "Related schools, cities & states" : `Schools in ${city || state}`;

  return (
    <div className="border-b border-white/10 py-10">
      <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#FF6B9A]">{heading}</h3>
      <div className="mt-6 grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5">
            <h4 className="font-extrabold text-white">
              {c.href ? <Link href={c.href} className="hover:text-[#FF6B9A]">{c.title}</Link> : c.title}
            </h4>
            {c.chips.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {c.chips.map((x) => <Link key={x.href + x.label} href={x.href} className={chipCls}>{x.label}</Link>)}
              </div>
            )}
          </div>
        ))}
        {(city || state) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5">
            <h4 className="font-extrabold text-white">Quick links</h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {city && <Link href={listingHref({ city })} className={chipCls}>All schools in {city}</Link>}
              {state && <Link href={listingHref({ state })} className={chipCls}>All schools in {state}</Link>}
              <Link href="/schools" className={chipCls}>All schools in India</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
