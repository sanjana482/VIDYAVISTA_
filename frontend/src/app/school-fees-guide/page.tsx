import type { Metadata } from "next";
import { fetchCMSPage } from "../lib/cmsApi";
import CMSPageLayout from "../components/CMSPageLayout";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const cms = await fetchCMSPage("school-fees-guide");
  const title = cms?.meta_title || cms?.title || "School Fees Guide 2027-28 | Structures & Breakups";
  const description = cms?.meta_description || "Learn how tuition, development, activity, caution, and transport charges are calculated.";
  const canonical = cms?.canonical_url || "/school-fees-guide";
  return {
    title: cms?.meta_title ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function Page() {
  const cms = await fetchCMSPage("school-fees-guide");
  return <CMSPageLayout page={cms} defaultBadge="Fee Transparency" />;
}
