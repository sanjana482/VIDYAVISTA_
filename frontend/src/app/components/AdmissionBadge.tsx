import type { School } from "../data/schools";

const TONE: Record<string, string> = {
  open: "bg-[#E4F7EC] text-[#0F7A3D]",
  closing_soon: "bg-[#FFF3DC] text-[#B26A00]",
  closed: "bg-[#FDE8EF] text-[#C8104F]",
  coming_soon: "bg-[#E1F1FA] text-[#0A5C91]",
};

export default function AdmissionBadge({
  school,
  className = "",
}: {
  school: Partial<School>;
  className?: string;
}) {
  const hasNoFee = school.fee === 0 || (!school.fee && school.feeMin === 0);
  if (hasNoFee) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold bg-[#E1F1FA] text-[#0A5C91] ${className}`}>
        <span className="h-2 w-2 rounded-full bg-current" />
        Beginning Soon
      </span>
    );
  }
  if (!school.admissionStatus || !school.admissionLabel) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold bg-[#E4F7EC] text-[#0F7A3D] ${className}`}>
        <span className="h-2 w-2 rounded-full bg-current" />
        Admission Now
      </span>
    );
  }
  const showSession = school.admissionSession && school.admissionStatus !== "closed";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold ${TONE[school.admissionStatus] ?? TONE.open} ${className}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {school.admissionLabel}
      {showSession ? ` ${school.admissionSession}` : ""}
    </span>
  );
}
