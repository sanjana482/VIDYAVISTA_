import Link from "next/link";

const TABS: [string, string][] = [
  ["about", "About"], ["fees", "Fees"], ["facilities", "Facilities"], ["admission", "Admission"],
  ["contact", "Contact"], ["photos", "Photos"], ["reviews", "Reviews"], ["faqs", "FAQs"],
];

export default function ProfileTabs({ basePath, active = "about" }: { basePath: string; active?: string }) {
  return (
    <div className="sticky top-[76px] z-40 border-b border-[#E1E7EE] bg-white/95 backdrop-blur sm:top-[80px]">
      <nav aria-label="Profile sections" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 lg:px-8">
        {TABS.map(([id, label]) => (
          <Link
            key={id}
            href={id === "about" ? basePath : `${basePath}/${id}`}
            aria-current={active === id ? "page" : undefined}
            className={`shrink-0 border-b-[3px] px-5 py-4 text-sm font-bold transition ${
              active === id ? "border-[#EC0E58] text-[#0B2A47]" : "border-transparent text-[#5C6A7B] hover:text-[#0A7BBF]"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}