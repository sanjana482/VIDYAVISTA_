import type { Metadata } from "next";
import { fetchCMSPage } from "../lib/cmsApi";
import CMSPageLayout from "../components/CMSPageLayout";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const cms = await fetchCMSPage("admission-guide");
  const title = cms?.meta_title || cms?.title || "School Admission Guide 2027-28 | VidyaVista";
  const description = cms?.meta_description || "Comprehensive guide for nursery, primary, and secondary school admissions in India.";
  const canonical = cms?.canonical_url || "/admission-guide";
  return {
    title: cms?.meta_title ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function Page() {
  const cms = await fetchCMSPage("admission-guide");
  return <CMSPageLayout page={cms} defaultBadge="Admission Resource" />;
}
