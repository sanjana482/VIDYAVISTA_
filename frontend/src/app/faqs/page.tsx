import type { Metadata } from "next";
import { fetchCMSPage } from "../lib/cmsApi";
import CMSPageLayout from "../components/CMSPageLayout";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const cms = await fetchCMSPage("faqs");
  const title = cms?.meta_title || cms?.title || "Frequently Asked Questions (FAQs) | VidyaVista";
  const description = cms?.meta_description || "Answers to the most common queries on school admissions, fees, comparisons, and transfers.";
  const canonical = cms?.canonical_url || "/faqs";
  return {
    title: cms?.meta_title ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function Page() {
  const cms = await fetchCMSPage("faqs");
  return <CMSPageLayout page={cms} defaultBadge="Help & FAQs" />;
}
