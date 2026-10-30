import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocationLanding from "../../../components/LocationLanding";
import { statesOf, stateFor } from "../../../data/schools";
import { fetchAllSchools, fetchAllSchoolsSafe } from "../../../lib/schoolsApi";
import { fetchLocationContent, resolveContent } from "../../../lib/locationsApi";
import { slugify, statePath } from "../../../lib/seo";

type Props = { params: { state: string } };

export const revalidate = 60;

const findState = (slug: string, states: string[]) => states.find((s) => slugify(s) === slug);

export async function generateStaticParams() {
  return statesOf(await fetchAllSchoolsSafe()).map((s) => ({ state: slugify(s) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const schools = await fetchAllSchools();
  const state = findState(params.state, statesOf(schools));
  if (!state) return { title: "Page not found", robots: { index: false } };
  const list = schools.filter((s) => stateFor(s) === state);
  const content = await fetchLocationContent("state", state);
  const view = resolveContent({ kind: "state", name: state }, content, list.length);
  const title = content?.metaTitle || `Best Schools in ${state} 2027-28 – Boarding, Day & Day + Boarding`;
  const description = view.description.slice(0, 200);
  return {
    // the admin's own title is used as-is; the default one gets the "| VidyaVista" suffix
    title: content?.metaTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: statePath(state) },
    openGraph: { title, description, url: statePath(state), type: "website", ...(view.photos[0] ? { images: [{ url: view.photos[0] }] } : {}) },
  };
}

export default async function StatePage({ params }: Props) {
  const schools = await fetchAllSchools();
  const state = findState(params.state, statesOf(schools));
  if (!state) notFound();
  const list = schools.filter((s) => stateFor(s) === state);
  const content = await fetchLocationContent("state", state);
  return <LocationLanding kind="state" name={state} state={state} list={list} all={schools} content={content} />;
}
