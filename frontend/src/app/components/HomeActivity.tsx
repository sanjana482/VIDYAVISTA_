"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { School } from "../data/schools";
import { BOARD_LABEL, formatFee } from "../data/schools";
import { schoolPath } from "../lib/seo";
import Icon from "./Icon";

const statusCopy: Record<string, string> = {
  open: "Applications open",
  closing_soon: "Closing soon",
  coming_soon: "Opens soon",
  closed: "Closed",
};

export default function HomeActivity({ list }: { list: School[] }) {
  const lookedAt = [...list].sort((a, b) => b.reviews - a.reviews || b.rating - a.rating).slice(0, 4);
  const moving = [...list]
    .filter((s) => s.admissionStatus && s.admissionStatus !== "closed")
    .concat(list.filter((s) => !s.admissionStatus))
    .slice(0, 4);

  return (
    <section className="bg-[#F7F4EF] py-16 sm:py-20">
      <div className="mx-auto grid max-w-[1720px] gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8 xl:px-12 [&>*]:min-w-0">
        <Panel
          kicker="Parents open these first"
          title="Schools with the most reviews"
          note="Sorted by how many families have already written about them."
        >
          {lookedAt.map((s, i) => (
            <Row key={s.id} school={s} index={i + 1} meta={`${s.reviews} reviews · ${s.rating.toFixed(1)}`} />
          ))}
        </Panel>
        <Panel
          kicker="Admission window"
          title="Where applications are moving"
          note="Open and upcoming sessions, so you do not miss a date."
        >
          {moving.map((s, i) => (
            <Row
              key={`m-${s.id}`}
              school={s}
              index={i + 1}
              meta={statusCopy[s.admissionStatus || ""] || s.admissionLabel || "Ask the school"}
            />
          ))}
        </Panel>
      </div>
    </section>
  );
}

function Panel({
  kicker,
  title,
  note,
  children,
}: {
  kicker: string;
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[28px] border border-[#E7DFD4] bg-white p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A4B32]">{kicker}</p>
      <h2 className="mt-2 text-balance text-[1.7rem] font-medium leading-tight tracking-tight text-[#172433] sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-[#66707C]">{note}</p>
      <div className="mt-6 divide-y divide-[#F0E8DE]">{children}</div>
    </div>
  );
}

function Row({ school, index, meta }: { school: School; index: number; meta: string }) {
  return (
    <Link href={schoolPath(school)} className="group flex items-center gap-4 py-4">
      <span className="w-6 font-heading text-lg text-[#C9B8A6]">{index}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-[#172433] group-hover:text-[#0A5C91]">{school.name}</span>
        <span className="mt-0.5 block truncate text-xs text-[#7A8490]">
          {school.city} · {BOARD_LABEL[school.board] ?? school.board} · from {formatFee(school.fee)}
        </span>
        <span className="mt-1 block text-xs font-semibold text-[#8A4B32] sm:hidden">{meta}</span>
      </span>
      <span className="hidden shrink-0 text-xs font-semibold text-[#8A4B32] sm:block">{meta}</span>
      <Icon name="arrowUpRight" className="h-4 w-4 shrink-0 text-[#0A5C91] opacity-60 transition group-hover:opacity-100" />
    </Link>
  );
}
