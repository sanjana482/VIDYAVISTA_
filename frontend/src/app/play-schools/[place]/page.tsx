import TypePlacePage, { typePlaceMetadata } from "../../components/TypePlacePage";
import FacetPage, { facetMetadata } from "../../components/FacetPage";

type Props = { params: { place: string } };

export const revalidate = 86400;

export const generateMetadata = ({ params }: Props) =>
  params.place === "india"
    ? facetMetadata({ typeKey: "Play School", placeSlug: "india" })
    : typePlaceMetadata("Play School", params.place);

export default function Page({ params }: Props) {
  if (params.place === "india") return <FacetPage typeKey="Play School" placeSlug="india" />;
  return <TypePlacePage typeKey="Play School" slug={params.place} />;
}
