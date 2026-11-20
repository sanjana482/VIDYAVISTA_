import type { Metadata } from "next";
import { fetchCMSPage } from "../lib/cmsApi";
import CMSPageLayout from "../components/CMSPageLayout";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const cms = await fetchCMSPage("contact");
  const title = cms?.meta_title || cms?.title || "Contact VidyaVista | Parent & School Support Team";
  const description = cms?.meta_description || "Get in touch with the VidyaVista team for admission guidance and school partnerships.";
  const canonical = cms?.canonical_url || "/contact";
  return {
    title: cms?.meta_title ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function Page() {
  const cms = await fetchCMSPage("contact");
  return <CMSPageLayout page={cms} defaultBadge="Get in Touch" />;
}
