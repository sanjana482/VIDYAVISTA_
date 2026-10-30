"use client";

// Homepage "Top States / Popular Cities" cards. STATIC on purpose (not read from the admin).
//   - Add a place: one line in `states` or `cities` below.
//   - Photo: save your own picture in  public/images/places/  named after the place in small letters
//     with dashes, e.g.  mumbai.jpg   new-delhi.jpg   uttar-pradesh.jpg   (see README.txt in that folder).
//     Photo missing -> a coloured card with the name is shown, nothing breaks.
//   - Click -> listing page opens with that state / city ticked (/boarding-schools/<state>, /day-schools/<city>).
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { savePreference } from "../lib/preferences";
import { typePath } from "../lib/links";
import { slugify } from "../lib/seo";
import Icon from "./Icon";

type Place = { name: string; image: string };
const place = (name: string): Place => ({ name, image: `/images/places/${slugify(name)}.jpg` });

const states: Place[] = [
  "Maharashtra",
  "Karnataka",
  "Delhi",
  "Tamil Nadu",
  "Gujarat",
  "Rajasthan",
  "Uttar Pradesh",
  "Madhya Pradesh",
  "Telangana",
  "West Bengal",
  "Uttarakhand",
  "Punjab",
  "Haryana",
  "Kerala",
  "Himachal Pradesh",
  "Goa",
].map(place);

const cities: Place[] = [
  "Mumbai",
  "Bengaluru",
  "Pune",
  "Dehradun",
  "Hyderabad",
  "Jaipur",
  "New Delhi",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Lucknow",
  "Indore",
  "Nashik",
  "Thane",
  "Navi Mumbai",
  "Nagpur",
  "Noida",
  "Gurugram",
  "Chandigarh",
  "Bhopal",
].map(place);

const TINTS = [
  "from-[#0A5C91] to-[#0795DC]",
  "from-[#C8104F] to-[#EC0E58]",
  "from-[#39506B] to-[#6E8BAD]",
  "from-[#0A7BBF] to-[#6ABEEE]",
  "from-[#A34262] to-[#D97798]",
];

function LocationCard({ place, index, onClick }: { place: Place; index: number; onClick: () => void }) {
  const [broken, setBroken] = useState(false);
  const showImg = !broken;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-48 w-44 shrink-0 snap-start overflow-hidden rounded-3xl border-4 border-white bg-[#DDEAF2] text-left shadow-md shadow-[#12304A]/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:h-52 sm:w-52"
    >
      {showImg ? (
        <img
          src={place.image}
          alt={`${place.name} schools`}
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${TINTS[index % TINTS.length]}`}>
          <span className="absolute -right-3 -top-6 select-none text-[9rem] font-extrabold leading-none text-white/15">{place.name[0]}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#172B32]/90 via-[#172B32]/15 to-transparent" />
      <span className="absolute bottom-4 left-4 right-14 text-lg font-extrabold leading-tight text-white sm:text-xl">{place.name}</span>
      <span className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F8FB] text-[#0A5C91] transition group-hover:bg-[#FF9DBB]">
        <Icon name="arrowUpRight" className="h-5 w-5" />
      </span>
    </button>
  );
}

/** one horizontal row with arrow buttons (swipe on phones) */
function Row({ items, onPick }: { items: Place[]; onPick: (name: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 520, behavior: "smooth" });
  const arrow =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#D6DDE5] bg-white text-[#0A5C91] shadow-lg transition hover:bg-[#0A5C91] hover:text-white md:flex";
  return (
    <div className="relative">
      <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className={`${arrow} -left-3`}>
        <Icon name="chevronLeft" className="h-5 w-5" />
      </button>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((p, i) => (
          <LocationCard key={p.name} place={p} index={i} onClick={() => onPick(p.name)} />
        ))}
      </div>
      <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className={`${arrow} -right-3`}>
        <Icon name="chevronRight" className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function PopularLocations() {
  const router = useRouter();

  return (
    <section className="overflow-hidden bg-gradient-to-b from-[#FAFCFD] via-[#F0F5F8] to-[#EEF5FA] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl space-y-20 px-5 lg:px-8">
        {/* Popular States */}
        <div>
          <div className="mb-8">
            <span className="inline-flex rounded-full bg-[#FAE5EC] px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[#C8104F]">
              Explore by state
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#12304A] sm:text-4xl">Top States for Boarding Schools</h2>
            <p className="mt-3 text-base leading-7 text-[#5C6A7B]">Explore boarding schools in popular education destinations across India.</p>
          </div>
          <Row
            items={states}
            onPick={(name) => {
              savePreference({ type: "Boarding Schools", location: name });
              router.push(typePath("Boarding School", name));
            }}
          />
        </div>

        {/* Popular Cities */}
        <div>
          <div className="mb-8">
            <span className="inline-flex rounded-full bg-[#DDEAF2] px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[#0A5C91]">
              Explore by city
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#12304A] sm:text-4xl">Popular Cities for Day Schools</h2>
            <p className="mt-3 text-base leading-7 text-[#5C6A7B]">Discover day schools across India&apos;s leading education destinations.</p>
          </div>
          <Row
            items={cities}
            onPick={(name) => {
              savePreference({ type: "Day Schools", location: name });
              router.push(typePath("Day School", name));
            }}
          />
        </div>
      </div>
    </section>
  );
}
