import type { Metadata } from "next";
import { fetchCMSPage } from "../lib/cmsApi";
import CMSPageLayout from "../components/CMSPageLayout";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const cms = await fetchCMSPage("admission-process");
  const title = cms?.meta_title || cms?.title || "School Admission Process 2027-28 | Step-by-Step";
  const description = cms?.meta_description || "Understand school admission process in India: timelines, evaluations, and documents.";
  const canonical = cms?.canonical_url || "/admission-process";
  return {
    title: cms?.meta_title ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function Page() {
  const cms = await fetchCMSPage("admission-process");
  return <CMSPageLayout page={cms} defaultBadge="Admission Roadmap" />;
}
