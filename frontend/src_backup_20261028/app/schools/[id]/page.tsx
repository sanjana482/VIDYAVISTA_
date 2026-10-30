import type { Metadata } from "next";
import { fetchAllSchoolsSafe } from "../../lib/schoolsApi";
import { schoolSlug } from "../../lib/seo";
import SchoolProfileView, { schoolMetadata } from "./SchoolProfileView";

type Props = { params: { id: string } };

// pages are rebuilt every minute; schools added later are rendered on first visit
export const revalidate = 60;

export async function generateStaticParams() {
  return (await fetchAllSchoolsSafe()).map((s) => ({ id: schoolSlug(s) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return schoolMetadata(params.id);
}

export default async function SchoolProfile({ params }: Props) {
  return SchoolProfileView({ param: params.id });
}