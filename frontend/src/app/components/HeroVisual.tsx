"use client";
// Right side of the listing hero. Works for every state / city because it is built from the real numbers of
// that place (schools, boards, rating, fees). If the admin uploaded photos for the place, those are shown instead.
import { useEffect, useState } from "react";
import Icon from "./Icon";

function useCountUp(target: number, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

type Props = {
  place: string; // "" = all India
  count: number;
  boards: string[];
  rating: number; // 0 = no reviews yet
  reviews: number;
  minFee: number; // 0 = unknown
  photos?: string[]; // admin photos for this place (optional)
};

const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function HeroVisual({ place, count, boards, rating, reviews, minFee, photos = [] }: Props) {
  const shown = useCountUp(count);
  const where = place || "India";

  if (photos.length > 0) {
    const [a, b = a, c = a] = photos;
    return (
      <div key={place} className="hidden grid-cols-2 gap-3 lg:grid">
        <div className="vv-rise row-span-2" style={{ animationDelay: "0ms" }}>
          <div className="vv-float-a h-full overflow-hidden rounded-3xl border-4 border-white shadow-xl shadow-[#0A5C91]/15">
            <img src={a} alt={`Schools in ${where}`} className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="vv-rise" style={{ animationDelay: "150ms" }}>
          <div className="vv-float-b overflow-hidden rounded-3xl border-4 border-white shadow-xl shadow-[#0A5C91]/15">
            <img src={b} alt={`${where} school students`} className="h-36 w-full object-cover" />
          </div>
        </div>
        <div className="vv-rise" style={{ animationDelay: "300ms" }}>
          <div className="vv-float-c overflow-hidden rounded-3xl border-4 border-white shadow-xl shadow-[#EC0E58]/15">
            <img src={c} alt={`${where} school campus`} className="h-36 w-full object-cover" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={place} className="relative hidden grid-cols-2 gap-4 lg:grid">
      <span className="vv-drift pointer-events-none absolute -left-6 top-6 h-16 w-16 rounded-full bg-[#0795DC]/15" />
      <span className="vv-drift pointer-events-none absolute -right-4 bottom-2 h-20 w-20 rounded-full bg-[#EC0E58]/15" style={{ animationDelay: "-3s" }} />

      {/* 1: number of schools */}
      <div className="vv-rise row-span-2" style={{ animationDelay: "0ms" }}>
        <div className="vv-float-a flex h-full min-h-[250px] flex-col justify-between rounded-3xl bg-gradient-to-br from-[#0A5C91] via-[#0A7BBF] to-[#0795DC] p-6 text-white shadow-xl shadow-[#0A5C91]/25">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Icon name="graduation" className="h-6 w-6" />
          </span>
          <div>
            <p className="text-6xl font-extrabold leading-none tracking-tight">{shown}</p>
            <p className="mt-2 text-sm font-semibold text-white/90">{count === 1 ? "school" : "schools"} in {where}</p>
            {boards.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {boards.slice(0, 4).map((b) => (
                  <span key={b} className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur">{b}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2: parent rating */}
      <div className="vv-rise" style={{ animationDelay: "160ms" }}>
        <div className="vv-float-b flex h-full min-h-[118px] flex-col justify-between rounded-3xl border border-[#E1E7EE] bg-white p-5 shadow-xl shadow-[#0B2A47]/8">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1D6] text-[#E99A24]">
            <Icon name="star" filled className="h-5 w-5" />
          </span>
          {rating > 0 ? (
            <div>
              <p className="text-2xl font-extrabold text-[#0B2A47]">{rating.toFixed(1)}<span className="text-sm text-[#707E8F]"> / 5</span></p>
              <p className="text-xs font-semibold text-[#707E8F]">{reviews} parent {reviews === 1 ? "review" : "reviews"}</p>
            </div>
          ) : (
            <p className="text-sm font-extrabold text-[#0B2A47]">Parent reviews & ratings</p>
          )}
        </div>
      </div>

      {/* 3: fees */}
      <div className="vv-rise" style={{ animationDelay: "320ms" }}>
        <div className="vv-float-c flex h-full min-h-[118px] flex-col justify-between rounded-3xl bg-gradient-to-br from-[#EC0E58] to-[#C8104F] p-5 text-white shadow-xl shadow-[#EC0E58]/25">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Icon name="trending" className="h-5 w-5" />
          </span>
          {minFee > 0 ? (
            <div>
              <p className="text-xs font-semibold text-white/85">Annual fees from</p>
              <p className="text-2xl font-extrabold">{rupee(minFee)}</p>
            </div>
          ) : (
            <p className="text-sm font-extrabold">Compare fees & admission</p>
          )}
        </div>
      </div>
    </div>
  );
}
