// "Featured" flag for a school card (the way shopping apps mark an offer / sponsored item).
import Icon from "./Icon";

export default function FeaturedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`vv-flag inline-flex items-center gap-1.5 rounded-r-full bg-gradient-to-r from-[#F5A623] via-[#F07A3B] to-[#EC0E58] py-1.5 pl-3 pr-4 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-[#EC0E58]/30 ${className}`}
    >
      <Icon name="sparkles" filled className="vv-twinkle h-3.5 w-3.5" />
      Featured
    </span>
  );
}
