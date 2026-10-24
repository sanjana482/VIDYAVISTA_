import type { Metadata } from "next";
import { notFound } from "next/navigation";

import SchoolProfileView from '../SchoolProfileView'
import { SECTIONS, type Section, schoolMetadata } from '@/app/lib/seo'

type Props = { params: { id: string; section: string } };

export const revalidate = 60;

// section pages are created on first visit (keeps the build fast and independent of the backend)
export async function generateStaticParams() {
  return [];
}

const isSection = (x: string): x is Section => (SECTIONS as readonly string[]).includes(x);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isSection(params.section)) return { title: "Page not found", robots: { index: false } };
  return schoolMetadata(params.id, params.section);
}

export default async function SchoolSectionPage({ params }: Props) {
  if (!isSection(params.section)) notFound();
  return SchoolProfileView({ param: params.id, section: params.section });
}