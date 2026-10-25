import TypePlacePage, { typePlaceMetadata } from "../../components/TypePlacePage";

type Props = { params: { place: string } };

export const revalidate = 60;

export const generateMetadata = ({ params }: Props) => typePlaceMetadata("Play School", params.place);

export default function Page({ params }: Props) {
  return <TypePlacePage typeKey="Play School" slug={params.place} />;
}
