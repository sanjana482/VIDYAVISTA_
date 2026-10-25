import TypePlacePage, { typePlaceMetadata } from "../../components/TypePlacePage";

type Props = { params: { place: string } };

export const revalidate = 60;

export const generateMetadata = ({ params }: Props) => typePlaceMetadata("Day School", params.place);

export default function Page({ params }: Props) {
  return <TypePlacePage typeKey="Day School" slug={params.place} />;
}
