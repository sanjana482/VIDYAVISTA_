"use client";

import type { School } from "../data/schools";

const filters = [
  { title: "Annual fee band", text: "Parents usually start with a ceiling, then drop schools that sit above it." },
  { title: "Board fit", text: "CBSE for transfers, ICSE for depth, IB when the family may move countries." },
  { title: "Commute or campus", text: "Day schools are filtered by locality. Boarding searches start from the state." },
  { title: "Admission date", text: "A strong school with a closed window is less useful than an open one this month." },
];

export default function ParentVoices({ list }: { list?: School[] }) {
  return (
    <section className="bg-[#172433] py-12 text-white sm:py-16">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F3C7B2]">How families decide</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-medium tracking-tight sm:text-4xl">
          The same four questions, every city.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filters.map((item, i) => (
            <article key={item.title} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="font-heading text-3xl text-[#F3C7B2]">0{i + 1}</p>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/70">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
