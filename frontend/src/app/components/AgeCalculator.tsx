"use client";

/**
 * Age Eligibility Calculator Widget
 * Enter child's DOB → see which class they are eligible for in 2027-28 academic year
 */

import { useState } from "react";
import Icon from "./Icon";

function getEligibleClass(dob: Date): { cls: string; label: string; color: string } {
  const cutoff = new Date("2027-06-01"); // most boards: age as on June 1
  let age = cutoff.getFullYear() - dob.getFullYear();
  const m = cutoff.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && cutoff.getDate() < dob.getDate())) age--;

  if (age < 2.5) return { cls: "Too young", label: "Child is below nursery age for 2027-28", color: "text-[#8B6914]" };
  if (age < 3) return { cls: "Nursery", label: "Eligible for Nursery (Pre-school) in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 4) return { cls: "LKG / Jr. KG", label: "Eligible for LKG / Junior KG in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 5) return { cls: "UKG / Sr. KG", label: "Eligible for UKG / Senior KG in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 6) return { cls: "Class 1", label: "Eligible for Class 1 in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 7) return { cls: "Class 2", label: "Eligible for Class 2 in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 8) return { cls: "Class 3", label: "Eligible for Class 3 in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 9) return { cls: "Class 4", label: "Eligible for Class 4 in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 10) return { cls: "Class 5", label: "Eligible for Class 5 in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 11) return { cls: "Class 6", label: "Eligible for Class 6 in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 12) return { cls: "Class 7", label: "Eligible for Class 7 in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 13) return { cls: "Class 8", label: "Eligible for Class 8 in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 14) return { cls: "Class 9", label: "Eligible for Class 9 in 2027-28", color: "text-[#0A7BBF]" };
  if (age < 15) return { cls: "Class 10", label: "Eligible for Class 10 in 2027-28", color: "text-[#C8104F]" };
  if (age < 16) return { cls: "Class 11", label: "Eligible for Class 11 in 2027-28", color: "text-[#C8104F]" };
  if (age < 17) return { cls: "Class 12", label: "Eligible for Class 12 in 2027-28", color: "text-[#C8104F]" };
  return { cls: "Graduated", label: "Child may have completed school age for 2027-28", color: "text-[#5C6A7B]" };
}

export default function AgeCalculator() {
  const [dob, setDob] = useState("");
  const [result, setResult] = useState<{ cls: string; label: string; color: string } | null>(null);

  function calculate() {
    if (!dob) return;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return;
    setResult(getEligibleClass(d));
  }

  return (
    <div className="rounded-2xl border border-[#D6E8F4] bg-gradient-to-br from-[#EAF4FC] to-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDEAF2] text-lg">
          <Icon name="graduation" className="h-5 w-5 text-[#0A6AA8]" />
        </span>
        <div>
          <p className="text-sm font-extrabold text-[#0B2A47]">Age Eligibility Calculator</p>
          <p className="text-xs text-[#687789]">Find the right class for 2027-28</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="date"
          value={dob}
          onChange={(e) => { setDob(e.target.value); setResult(null); }}
          max={new Date().toISOString().split("T")[0]}
          className="flex-1 rounded-xl border border-[#C9D3DF] bg-white px-3 py-2.5 text-sm text-[#0B2A47] outline-none focus:border-[#0795DC] focus:ring-2 focus:ring-[#0795DC]/20"
          placeholder="Child's Date of Birth"
        />
        <button
          type="button"
          onClick={calculate}
          disabled={!dob}
          className="rounded-xl bg-[#0A6AA8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#085A91] disabled:opacity-50"
        >
          Check →
        </button>
      </div>

      {result && (
        <div className="mt-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#D6E8F4]">
          <p className={`text-lg font-extrabold ${result.color}`}>{result.cls}</p>
          <p className="mt-0.5 text-xs text-[#5C6A7B]">{result.label}</p>
        </div>
      )}
    </div>
  );
}
