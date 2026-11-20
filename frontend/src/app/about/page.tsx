import type { Metadata } from "next";
import { fetchCMSPage } from "../lib/cmsApi";
import CMSPageLayout from "../components/CMSPageLayout";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const cms = await fetchCMSPage("about");
  const title = cms?.meta_title || cms?.title || "About Us | VidyaVista - India's School Discovery Platform";
  const description = cms?.meta_description || "Learn about VidyaVista's mission to empower parents with transparent fee structures.";
  const canonical = cms?.canonical_url || "/about";
  return {
    title: cms?.meta_title ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function Page() {
  const cms = await fetchCMSPage("about");
  return <CMSPageLayout page={cms} defaultBadge="About VidyaVista" />;
}
