import type { Metadata } from "next";
import { fetchCMSPage } from "../lib/cmsApi";
import CMSPageLayout from "../components/CMSPageLayout";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const cms = await fetchCMSPage("documents-required");
  const title = cms?.meta_title || cms?.title || "Documents Required for School Admission 2027-28 | VidyaVista";
  const description = cms?.meta_description || "Complete checklist of original certificates and self-attested copies needed for admission.";
  const canonical = cms?.canonical_url || "/documents-required";
  return {
    title: cms?.meta_title ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function Page() {
  const cms = await fetchCMSPage("documents-required");
  return <CMSPageLayout page={cms} defaultBadge="Verification Checklist" />;
}
