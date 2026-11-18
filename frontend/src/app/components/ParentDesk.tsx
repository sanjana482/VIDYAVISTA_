"use client";

import Link from "next/link";
import Icon from "./Icon";

const tools = [
  {
    id: "compare",
    title: "Side-by-side fees",
    text: "Open the listing and shortlist schools to compare.",
    icon: "scale",
    href: "/schools",
  },
  {
    id: "board",
    title: "Pick a board",
    text: "CBSE, ICSE, IB, Cambridge or state board.",
    icon: "book",
    href: "#boards",
  },
  {
    id: "city",
    title: "Start from a city",
    text: "Day schools near home, boarding by state.",
    icon: "mapPin",
    href: "#places",
  },
] as const;

const checks = [
  "Fees for the class you want, plus transport and annual charges",
  "Board, class range, and whether day or boarding is offered",
  "How far the campus is from home, and the visit day",
  "What recent parents wrote about teachers and safety",
];

export default function ParentDesk() {
  return (
    <section id="tools" className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A5C91]">Parent desk</p>
        <h2 className="mt-3 max-w-xl text-3xl font-medium tracking-tight text-[#172433] sm:text-4xl">
          Three checks before you fill a form.
        </h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                className="rounded-[24px] border border-[#E7DFD4] bg-[#FFFcf8] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#0A5C91]"
              >
                <span className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F4EFE7] text-[#172433]">
                    <Icon name={tool.icon} className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold text-[#172433]">{tool.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-[#66707C]">{tool.text}</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="rounded-[28px] border border-[#E7DFD4] bg-[#F7F4EF] p-5 sm:p-7">
            <h3 className="font-heading text-2xl text-[#172433]">What to confirm on a shortlist</h3>
            <p className="mt-2 text-sm leading-6 text-[#66707C]">
              The same four questions, for every school you keep. Schools publish their own dates and fee sheets.
            </p>
            <ul className="mt-5 space-y-3">
              {checks.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#172433]">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#0A5C91]">
                    <Icon name="check" className="h-3.5 w-3.5" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/schools"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0A5C91]"
            >
              Browse schools
              <Icon name="arrowUpRight" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
