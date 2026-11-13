import type { Metadata } from "next";
import SchoolProfileView, { schoolMetadata } from "./SchoolProfileView";

type Props = { params: { id: string } };

// Dynamic fetch to reflect admin edits immediately
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return schoolMetadata(params.id);
}

export default async function SchoolProfile({ params }: Props) {
  return SchoolProfileView({ param: params.id });
}
