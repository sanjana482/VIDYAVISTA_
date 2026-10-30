import TypePlacePage, { typePlaceMetadata } from "../../components/TypePlacePage";

type Props = { params: { place: string } };

export const revalidate = 60;

export const generateMetadata = ({ params }: Props) => typePlaceMetadata("Boarding School", params.place);

export default function Page({ params }: Props) {
  return <TypePlacePage typeKey="Boarding School" slug={params.place} />;
}
