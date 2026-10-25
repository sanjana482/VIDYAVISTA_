import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocationLanding from "../components/LocationLanding";
import { statesOf, stateFor, type School } from "../data/schools";
import { fetchAllSchools, fetchAllSchoolsSafe } from "./schoolsApi";
import { slugify } from "./seo";

export type Kind = "day" | "boarding" | "play";

// TODO: field ke naam apne School type ke hisaab se badlo
const txt = (s: School) => `${(s as any).type ?? ""} ${(s as any).level ?? ""} ${s.name}`;

const CONFIG: Record<Kind, { base: string; label: string; match: (s: School) => boolean }> = {
  boarding: { base: "boarding-schools", label: "Boarding Schools", match: (s) => /boarding/i.test(txt(s)) },
  day: { base: "day-schools", label: "Day Schools", match: (s) => /day/i.test(txt(s)) },
  play: { base: "play-schools", label: "Play Schools", match: (s) => /play|pre-?school|nursery|kindergarten/i.test(txt(s)) },
};

const findState = (slug: string, states: string[]) => states.find((s) => slugify(s) === slug);

export function makeTypePage(kind: Kind) {
  const { base, label, match } = CONFIG[kind];
  type Props = { params: { state: string } };

  async function generateStaticParams() {
    return statesOf(await fetchAllSchoolsSafe()).map((s) => ({ state: slugify(s) }));
  }

  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const schools = await fetchAllSchools();
    const state = findState(params.state, statesOf(schools));
    const list = state ? schools.filter((s) => stateFor(s) === state && match(s)) : [];
    if (!state || !list.length) return { title: "Page not found", robots: { index: false } };
    const title = `Best ${label} in ${state} 2027-28 – Fees & Reviews`;
    const description = `Compare ${list.length} ${label.toLowerCase()} in ${state}: fees, facilities, admission details and parent reviews.`;
    const path = `/${base}/${slugify(state)}`;
    return { title, description, alternates: { canonical: path }, openGraph: { title, description, url: path, type: "website" } };
  }

  async function Page({ params }: Props) {
    const schools = await fetchAllSchools();
    const state = findState(params.state, statesOf(schools));
    if (!state) notFound();
    const list = schools.filter((s) => stateFor(s) === state && match(s));
    if (!list.length) notFound();
    return <LocationLanding kind="state" name={state} state={state} list={list} all={schools} content={null} />;
  }

  return { generateStaticParams, generateMetadata, Page };
}