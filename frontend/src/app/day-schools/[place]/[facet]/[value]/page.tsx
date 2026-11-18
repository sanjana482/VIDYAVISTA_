import FacetPage, { facetMetadata } from "../../../../components/FacetPage";

type Props = { params: { place: string; facet: string; value: string } };

// e.g. /day-schools/<place>/board/cbse, /gender/girls, /fees/under-50000, /area/<area>
export const revalidate = 86400;
export const dynamicParams = true;

export const generateMetadata = ({ params }: Props) =>
  facetMetadata({ typeKey: "Day School", placeSlug: params.place, facet: params.facet, value: params.value });

export default function Page({ params }: Props) {
  return <FacetPage typeKey="Day School" placeSlug={params.place} facet={params.facet} value={params.value} />;
}
