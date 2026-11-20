import type { Metadata } from "next";
import { fetchCMSPage } from "../lib/cmsApi";
import CMSPageLayout from "../components/CMSPageLayout";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const cms = await fetchCMSPage("support");
  const title = cms?.meta_title || cms?.title || "Help & Support Center | VidyaVista";
  const description = cms?.meta_description || "Guides, troubleshooting, and direct assistance for your school admission queries.";
  const canonical = cms?.canonical_url || "/support";
  return {
    title: cms?.meta_title ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function Page() {
  const cms = await fetchCMSPage("support");
  return <CMSPageLayout page={cms} defaultBadge="Parent Helpline" />;
}
