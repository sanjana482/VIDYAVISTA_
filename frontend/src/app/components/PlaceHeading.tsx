"use client";
// Big page heading of /day-schools/pune etc.
// Server-rendered with the place from the URL (good for Google), then follows the filters the visitor changes.
import { useEffect, useState } from "react";
import { BOARD_LABEL } from "../data/schools";
import { typePlural } from "../lib/links";

export const APPLIED_EVENT = "vv-applied";
export type AppliedInfo = { type: string; place: string; board: string };

export const cleanPlaceName = (p: string) =>
  (p || "").replace(/^(boarding|day|play)?\s*schools?\s*in\s*/i, "").trim();

export const headingFor = ({ type, place, board }: AppliedInfo) => {
  const p = cleanPlaceName(place);
  return `${board ? `${BOARD_LABEL[board] ?? board} ` : ""}${typePlural(type)}${p ? ` in ${p}` : ""}`;
};

export default function PlaceHeading({ initial, description }: { initial: AppliedInfo; description?: string }) {
  const [cur, setCur] = useState<AppliedInfo>(initial);
  useEffect(() => {
    const on = (e: Event) => setCur((e as CustomEvent<AppliedInfo>).detail);
    window.addEventListener(APPLIED_EVENT, on);
    return () => window.removeEventListener(APPLIED_EVENT, on);
  }, []);
  const same = cur.place === initial.place && cur.type === initial.type && cur.board === initial.board;
  return (
    <header className="mx-auto max-w-[1720px] px-4 sm:px-6 pb-2 pt-10 lg:px-8 xl:px-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0B2A47] sm:text-5xl">
        Best {headingFor(cur)} <span className="text-[#EC0E58]">2027-28</span>
      </h1>
      {same && description && <p className="mt-4 max-w-4xl leading-8 text-[#4E5A68]">{description}</p>}
    </header>
  );
}
