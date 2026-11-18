import TypePlacePage, { typePlaceMetadata } from "../../components/TypePlacePage";
import FacetPage, { facetMetadata } from "../../components/FacetPage";

type Props = { params: { place: string } };

export const revalidate = 86400;

// /boarding-schools/india = "Best Boarding Schools in India" (hub with every category).
// Any other value is a state or a city, handled by the same page as before.
export const generateMetadata = ({ params }: Props) =>
  params.place === "india"
    ? facetMetadata({ typeKey: "Boarding School", placeSlug: "india" })
    : typePlaceMetadata("Boarding School", params.place);

export default function Page({ params }: Props) {
  if (params.place === "india") return <FacetPage typeKey="Boarding School" placeSlug="india" />;
  return <TypePlacePage typeKey="Boarding School" slug={params.place} />;
}
