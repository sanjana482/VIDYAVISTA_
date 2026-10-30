import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocationLanding from "../../components/LocationLanding";
import { citiesOf, stateFor } from "../../data/schools";
import { fetchAllSchools, fetchAllSchoolsSafe } from "../../lib/schoolsApi";
import { fetchLocationContent, resolveContent } from "../../lib/locationsApi";
import { cityPath, slugify } from "../../lib/seo";

type Props = { params: { city: string } };

export const revalidate = 60;

const findCity = (slug: string, cities: string[]) => cities.find((c) => slugify(c) === slug);

export async function generateStaticParams() {
  return citiesOf(await fetchAllSchoolsSafe()).map((c) => ({ city: slugify(c) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const schools = await fetchAllSchools();
  const city = findCity(params.city, citiesOf(schools));
  if (!city) return { title: "Page not found", robots: { index: false } };
  const list = schools.filter((s) => s.city === city);
  const content = await fetchLocationContent("city", city);
  const view = resolveContent({ kind: "city", name: city }, content, list.length);
  const title = content?.metaTitle || `Best Schools in ${city} 2027-28 – Fees, Boards & Reviews`;
  const description = view.description.slice(0, 200);
  return {
    // the admin's own title is used as-is; the default one gets the "| VidyaVista" suffix
    title: content?.metaTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: cityPath(city) },
    openGraph: { title, description, url: cityPath(city), type: "website", ...(view.photos[0] ? { images: [{ url: view.photos[0] }] } : {}) },
  };
}

export default async function CityPage({ params }: Props) {
  const schools = await fetchAllSchools();
  const city = findCity(params.city, citiesOf(schools));
  if (!city) notFound();
  const list = schools.filter((s) => s.city === city);
  const content = await fetchLocationContent("city", city);
  return <LocationLanding kind="city" name={city} state={stateFor(list[0])} list={list} all={schools} content={content} />;
}
