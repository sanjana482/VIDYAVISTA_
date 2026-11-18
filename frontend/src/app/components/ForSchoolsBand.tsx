import Link from "next/link";

export default function ForSchoolsBand() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto grid max-w-[1240px] items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#EC0E58]">For schools</p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-[#172433] sm:text-4xl">
            Put your campus where parents already compare.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#5C6A7B]">
            Claim the profile, update fees and photos, and answer enquiries from one desk. Parents see a verified listing, not a brochure PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/login?role=school" className="vv-btn inline-flex rounded-full bg-[#172433] px-6 py-3.5 text-sm font-semibold text-white">
            Open institution portal
          </Link>
          <Link href="/schools" className="inline-flex rounded-full border border-[#E7DFD4] px-6 py-3.5 text-sm font-semibold text-[#172433] hover:border-[#172433]">
            See a live listing
          </Link>
        </div>
      </div>
    </section>
  );
}
