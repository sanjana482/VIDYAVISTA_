import type { Metadata } from "next";
import { fetchCMSPage } from "../lib/cmsApi";
import CMSPageLayout from "../components/CMSPageLayout";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const cms = await fetchCMSPage("parents-guide");
  const title = cms?.meta_title || cms?.title || "The Complete Parent's Guide to Choosing the Right School";
  const description = cms?.meta_description || "Expert advice for parents on evaluating boards, teacher ratios, and school culture.";
  const canonical = cms?.canonical_url || "/parents-guide";
  return {
    title: cms?.meta_title ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function Page() {
  const cms = await fetchCMSPage("parents-guide");
  return <CMSPageLayout page={cms} defaultBadge="Parenting & Education" />;
}
