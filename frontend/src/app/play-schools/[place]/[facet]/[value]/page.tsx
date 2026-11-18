import FacetPage, { facetMetadata } from "../../../../components/FacetPage";

type Props = { params: { place: string; facet: string; value: string } };

export const revalidate = 86400;
export const dynamicParams = true;

export const generateMetadata = ({ params }: Props) =>
  facetMetadata({ typeKey: "Play School", placeSlug: params.place, facet: params.facet, value: params.value });

export default function Page({ params }: Props) {
  return <FacetPage typeKey="Play School" placeSlug={params.place} facet={params.facet} value={params.value} />;
}
